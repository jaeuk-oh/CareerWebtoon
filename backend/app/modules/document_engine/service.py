import json
import logging
import re
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.exceptions import AppException
from .schemas import GenerateRequest, GeneratedDocResponse
from .prompts import (
    RESUME_SYSTEM,
    COVER_LETTER_SYSTEM,
    CAREER_DESC_SYSTEM,
    CLAIM_EXTRACT_SYSTEM,
    REWRITE_SPAN_SYSTEM,
)
from app.core.ownership import assert_generated_document_owner
from app.services.llm_gateway import LLMGateway

logger = logging.getLogger(__name__)


def _as_uuid_or_none(value) -> str | None:
    if not value:
        return None
    try:
        return str(uuid.UUID(str(value)))
    except ValueError:
        return None


def _snap_claim_to_document(claim_text, content: str) -> str:
    """
    Return the claim exactly as it appears in the document, when it can be located.

    The editor highlights a claim by finding it in the document with a plain string
    match, so a claim that differs only by whitespace or a stray trailing character
    would never light up next to the sentence it is about. Try the text as given
    first, then a whitespace-insensitive search that maps back to the real span.

    Text that still cannot be found is returned unchanged rather than dropped:
    validation and defence questions are built from the claim itself and stay useful
    even when the editor cannot highlight it in place.
    """
    cleaned = (claim_text or "").strip()
    if not cleaned or cleaned in content:
        return cleaned

    pattern = r"\s+".join(re.escape(part) for part in cleaned.split())
    match = re.search(pattern, content)
    return match.group(0) if match else cleaned


_VALID_CLAIM_STATUSES = {"VERIFIED", "UNVERIFIED", "FLAGGED"}


def _normalize_claim_status(value) -> str:
    if isinstance(value, str) and value.strip().upper() in _VALID_CLAIM_STATUSES:
        return value.strip().upper()
    return "UNVERIFIED"

class DocumentEngineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMGateway()

    async def _build_writing_context(self, job_id: str, user_id: str) -> dict:
        """
        Gather the real material a document is written from: the job, the strategy that
        selected which experiences to lead with, and those experiences' 3C4P breakdown
        and evidence.

        Shared by full generation and single-sentence rewriting — a rewrite is only
        worth anything if it is anchored to the same evidence the document came from,
        rather than the model improving a sentence in a vacuum.
        """
        # 1. Fetch job requirements
        job_res = await self.db.execute(
            text("SELECT company_name, position, jd_analysis FROM jobs WHERE id = :job_id AND user_id = :user_id"),
            {"job_id": job_id, "user_id": user_id}
        )
        job = job_res.fetchone()
        if not job:
            raise AppException(status_code=404, detail="채용 공고를 찾을 수 없습니다.")

        # 2. Fetch the latest strategy for this job
        res_strategy = await self.db.execute(
            text("""
                SELECT primary_experience_id, secondary_experience_id, gap_analysis, strategy_text
                FROM application_strategies
                WHERE job_id = :job_id AND user_id = :user_id
                ORDER BY created_at DESC LIMIT 1
            """),
            {"job_id": job_id, "user_id": user_id}
        )
        strategy = res_strategy.fetchone()
        if not strategy:
            raise AppException(status_code=404, detail="지원 전략이 없습니다. 먼저 전략 수립을 진행해주세요.")

        # 3. Fetch full 3C4P + evidence for the primary/secondary experiences the
        # strategy selected, so the model writes from real, specific material
        # instead of the raw strategy row (which is all it used to see).
        exp_ids = [eid for eid in [strategy.primary_experience_id, strategy.secondary_experience_id] if eid]
        experiences_context = []
        if exp_ids:
            exp_res = await self.db.execute(
                text("SELECT id, title, description FROM experiences WHERE id = ANY(:ids) AND user_id = :user_id"),
                {"ids": exp_ids, "user_id": user_id}
            )
            for exp in exp_res.fetchall():
                c3p4_res = await self.db.execute(
                    text("""
                        SELECT customer, company_context, competitor, place, product, price, promotion
                        FROM experience_3c4p WHERE experience_id = :exp_id
                    """),
                    {"exp_id": exp.id}
                )
                c3p4 = c3p4_res.mappings().first()
                evidence_res = await self.db.execute(
                    text("SELECT claim, evidence_text, is_quantitative FROM evidence WHERE experience_id = :exp_id"),
                    {"exp_id": exp.id}
                )
                evidence = [dict(e) for e in evidence_res.mappings().all()]
                experiences_context.append({
                    "title": exp.title,
                    "description": exp.description,
                    "3c4p": dict(c3p4) if c3p4 else None,
                    "evidence": evidence
                })

        gap_analysis = strategy.gap_analysis or {}
        return {
            "company_name": job.company_name,
            "position": job.position,
            "job_requirements": (job.jd_analysis or {}).get("requirements", []),
            "strategy_text": strategy.strategy_text,
            "gaps": gap_analysis.get("gaps", []),
            "experiences": experiences_context
        }

    def _prompt_for_doc_type(self, doc_type: str) -> str:
        if doc_type == "cover_letter":
            return COVER_LETTER_SYSTEM
        if doc_type == "career_desc":
            return CAREER_DESC_SYSTEM
        return RESUME_SYSTEM

    async def _save_generated_document(self, job_id: str, user_id: str, doc_type: str, content: str) -> dict:
        # Shared by the plain and streaming generation paths — both end up with a full
        # document string and need the exact same version bookkeeping + claim extraction.
        doc_id = str(uuid.uuid4())

        # Every regeneration of the same (job, doc_type) is a new version. This used
        # to insert a literal 1 on every row, so the frontend's "latest document" rule
        # (pick the highest version) could never tell two drafts apart and would show
        # a stale draft after the user hit "AI 초안 다시 생성".
        version_res = await self.db.execute(
            text("""
            SELECT COALESCE(MAX(version), 0) + 1 AS next_version
            FROM generated_documents
            WHERE job_id = :job_id AND user_id = :user_id AND doc_type = :doc_type
            """),
            {"job_id": job_id, "user_id": user_id, "doc_type": doc_type}
        )
        next_version = version_res.scalar() or 1

        await self.db.execute(
            text("""
            INSERT INTO generated_documents (id, job_id, user_id, doc_type, content, version, created_at)
            VALUES (:id, :job_id, :user_id, :doc_type, :content, :version, NOW())
            """),
            {
                "id": doc_id,
                "job_id": job_id,
                "user_id": user_id,
                "doc_type": doc_type,
                "content": content,
                "version": next_version
            }
        )

        saved_claims = await self._extract_and_store_claims(doc_id, content)
        await self.db.commit()

        return {
            "id": doc_id,
            "job_id": job_id,
            "doc_type": doc_type,
            "content": content,
            "version": next_version,
            "claims_count": saved_claims,
            "created_at": "now"
        }

    async def import_document(self, job_id: str, user_id: str, doc_type: str, content: str) -> dict:
        """
        Save a user-supplied document (uploaded PDF/DOCX text, or pasted directly into
        the editor before ever generating a draft) as a real generated_documents row —
        same version bookkeeping and claim extraction as an AI-generated draft, just
        skipping the LLM write step. Without this, an uploaded resume only lives in
        React state until the user first clicks "AI 초안 생성", and a refresh before
        that loses it.
        """
        if not content.strip():
            raise AppException(status_code=400, detail="빈 문서는 저장할 수 없습니다.")
        # Confirms the job belongs to this user before creating a row under it.
        job_res = await self.db.execute(
            text("SELECT 1 FROM jobs WHERE id = :job_id AND user_id = :user_id"),
            {"job_id": job_id, "user_id": user_id}
        )
        if not job_res.first():
            raise AppException(status_code=404, detail="채용 공고를 찾을 수 없습니다.")
        return await self._save_generated_document(job_id, user_id, doc_type, content)

    async def generate_document(self, data: GenerateRequest, user_id: str) -> dict:
        job_id = data.job_id
        context = json.dumps(
            await self._build_writing_context(job_id, user_id), ensure_ascii=False, default=str
        )
        prompt = self._prompt_for_doc_type(data.doc_type)

        # The Critic model (nemotron-3-super) has proven more reliable than the Writer
        # model for larger, more complex generations elsewhere in this app (see
        # defense_engine's question-batch generation).
        generated_content = await self.llm.analyze(system_prompt=prompt, prompt=context, max_tokens=3072)

        return await self._save_generated_document(job_id, user_id, data.doc_type, generated_content)

    async def generate_document_stream(self, data: GenerateRequest, user_id: str):
        """
        Same generation as generate_document, but yields Server-Sent Events so the
        editor can render tokens as they arrive instead of showing a spinner for the
        entire generation. Streaming was already wired into LLMGateway
        (stream_generate) but nothing in the app called it — every document wait was
        a blank spinner regardless.

        Each event is `data: <json>\n\n`. Content chunks look like {"delta": "..."};
        the final event is the same metadata generate_document returns, tagged
        {"done": true, ...}, so the frontend can pick up the real doc id/version/
        claims_count once the stream ends.
        """
        job_id = data.job_id
        context = json.dumps(
            await self._build_writing_context(job_id, user_id), ensure_ascii=False, default=str
        )
        prompt = self._prompt_for_doc_type(data.doc_type)

        chunks: list[str] = []
        try:
            async for delta in self.llm.stream_generate(
                prompt=context, system_prompt=prompt, model=self.llm.CRITIC_MODEL, timeout=120.0
            ):
                chunks.append(delta)
                yield f"data: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Streamed generation failed: {e}")
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
            return

        generated_content = "".join(chunks)
        if not generated_content.strip():
            yield f"data: {json.dumps({'error': 'empty generation'}, ensure_ascii=False)}\n\n"
            return

        saved = await self._save_generated_document(job_id, user_id, data.doc_type, generated_content)
        yield f"data: {json.dumps({**saved, 'done': True}, ensure_ascii=False)}\n\n"

    async def _extract_and_store_claims(self, doc_id: str, content: str) -> int:
        """
        Pull the verifiable claims out of a document and store them against it.

        Shared by generation and by saving an edited document. Claims are what
        validation and defence questions run on, so whenever the text changes they have
        to be re-derived or the two silently drift apart.

        Extraction failure is deliberately non-fatal: the document itself is real,
        usable output and is worth keeping even when this step misbehaves.
        """
        try:
            # A full resume can yield enough claims that the default token budget
            # truncates the JSON mid-string and json.loads fails, so give it headroom.
            extraction = await self.llm.evaluate_json(
                system_prompt=CLAIM_EXTRACT_SYSTEM, prompt=content, max_tokens=4096
            )
            claims = extraction.get("claims", [])
        except Exception as e:
            logger.error(f"Claim extraction failed, storing document without claims: {e}")
            return 0

        unlocatable = 0
        saved = 0
        for claim in claims:
            claim_text = _snap_claim_to_document(claim.get("claim_text"), content)
            if not claim_text:
                continue
            if claim_text not in content:
                unlocatable += 1
            await self.db.execute(
                text("""
                INSERT INTO claims (id, generated_document_id, claim_text, evidence_id, status)
                VALUES (:id, :doc_id, :claim_text, :evidence_id, :status)
                """),
                {
                    "id": str(uuid.uuid4()),
                    "doc_id": doc_id,
                    "claim_text": claim_text,
                    "evidence_id": _as_uuid_or_none(claim.get("evidence_id")),
                    "status": _normalize_claim_status(claim.get("status"))
                }
            )
            saved += 1

        if unlocatable:
            # Not fatal — these claims are still validated and still generate defence
            # questions, they just cannot be highlighted inside the document.
            logger.warning(
                "%d/%d claims could not be located verbatim in document %s",
                unlocatable, saved, doc_id
            )
        return saved

    async def update_document(
        self, doc_id: str, user_id: str, content: str, reextract_claims: bool = False
    ) -> dict:
        """
        Persist an edited document.

        Editing used to be local-only — the editor kept the text in localStorage — so
        validation and defence questions went on running against the originally
        generated text no matter what the user changed.

        `reextract_claims` splits the cost. The editor autosaves cheaply while the user
        types, and only pays for a fresh extraction when it is about to validate.
        Re-extracting replaces the old claims outright: they described sentences that no
        longer exist, and their defence questions cascade away with them.
        """
        await assert_generated_document_owner(self.db, doc_id, user_id)

        await self.db.execute(
            text("""
            UPDATE generated_documents
            SET content = :content, updated_at = NOW()
            WHERE id = :doc_id AND user_id = :user_id
            """),
            {"content": content, "doc_id": doc_id, "user_id": user_id}
        )

        if reextract_claims:
            await self.db.execute(
                text("DELETE FROM claims WHERE generated_document_id = :doc_id"),
                {"doc_id": doc_id}
            )
            claims_count = await self._extract_and_store_claims(doc_id, content)
        else:
            res = await self.db.execute(
                text("SELECT COUNT(*) FROM claims WHERE generated_document_id = :doc_id"),
                {"doc_id": doc_id}
            )
            claims_count = res.scalar() or 0

        await self.db.commit()

        doc = await self.get_document(doc_id, user_id)
        doc["claims_count"] = claims_count
        return doc

    async def rewrite_span(
        self, doc_id: str, user_id: str, claim_text: str, instruction: str | None = None
    ) -> dict:
        """
        Rewrite a single sentence so it can be defended, using the candidate's real
        evidence. Returns the proposal only — applying it is the user's decision, and
        the edited document is saved through update_document like any other edit.
        """
        await assert_generated_document_owner(self.db, doc_id, user_id)

        doc = await self.get_document(doc_id, user_id)
        if not doc:
            raise AppException(status_code=404, detail="문서를 찾을 수 없습니다.")

        content = doc.get("content") or ""
        target = (claim_text or "").strip()
        if not target or target not in content:
            # The editor locates claims by exact match too, so a miss here means the
            # document on the server is not the text the user is looking at.
            raise AppException(
                status_code=409,
                detail="이 문장을 서버에 저장된 문서에서 찾을 수 없습니다. 편집 내용을 저장한 뒤 다시 시도해주세요."
            )

        writing_context = await self._build_writing_context(doc["job_id"], user_id)
        payload = {
            **writing_context,
            "document": content,
            "sentence_to_rewrite": target,
            "user_instruction": instruction or None
        }

        result = await self.llm.generate_json(
            system_prompt=REWRITE_SPAN_SYSTEM,
            prompt=json.dumps(payload, ensure_ascii=False, default=str),
            max_tokens=1024
        )

        rewritten = (result.get("rewritten") or "").strip()
        if not rewritten:
            raise AppException(status_code=502, detail="재작성 결과를 받지 못했습니다. 다시 시도해주세요.")

        return {
            "original": target,
            "rewritten": rewritten,
            "rationale": (result.get("rationale") or "").strip()
        }

    async def list_documents(self, job_id: str, user_id: str) -> list:
        res = await self.db.execute(
            text("""
            SELECT id, job_id, doc_type, version, created_at
            FROM generated_documents
            WHERE job_id = :job_id AND user_id = :user_id
            ORDER BY version DESC, created_at DESC
            """),
            {"job_id": job_id, "user_id": user_id}
        )
        return [{"id": str(r.id), "job_id": str(r.job_id), "doc_type": r.doc_type, "version": r.version, "created_at": str(r.created_at)} for r in res.fetchall()]

    async def get_document(self, doc_id: str, user_id: str) -> dict:
        res = await self.db.execute(
            text("SELECT id, job_id, doc_type, content, version, created_at FROM generated_documents WHERE id = :doc_id AND user_id = :user_id"),
            {"doc_id": doc_id, "user_id": user_id}
        )
        doc = res.fetchone()
        if not doc:
            return None
            
        res_claims = await self.db.execute(
            text("SELECT COUNT(*) FROM claims WHERE generated_document_id = :doc_id"),
            {"doc_id": doc_id}
        )
        claims_count = res_claims.scalar() or 0
            
        return {
            "id": str(doc.id),
            "job_id": str(doc.job_id),
            "doc_type": doc.doc_type,
            "content": doc.content,
            "version": doc.version,
            "claims_count": claims_count,
            "created_at": str(doc.created_at)
        }
