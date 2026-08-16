import json
import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.exceptions import AppException
from .schemas import GenerateRequest, GeneratedDocResponse
from .prompts import RESUME_SYSTEM, COVER_LETTER_SYSTEM, CAREER_DESC_SYSTEM, CLAIM_EXTRACT_SYSTEM
from app.services.llm_gateway import LLMGateway

logger = logging.getLogger(__name__)


def _as_uuid_or_none(value) -> str | None:
    if not value:
        return None
    try:
        return str(uuid.UUID(str(value)))
    except ValueError:
        return None


_VALID_CLAIM_STATUSES = {"VERIFIED", "UNVERIFIED", "FLAGGED"}


def _normalize_claim_status(value) -> str:
    if isinstance(value, str) and value.strip().upper() in _VALID_CLAIM_STATUSES:
        return value.strip().upper()
    return "UNVERIFIED"

class DocumentEngineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMGateway()

    async def generate_document(self, data: GenerateRequest, user_id: str) -> dict:
        job_id = data.job_id

        # 1. Fetch job requirements
        job_res = await self.db.execute(
            text("SELECT company_name, position, jd_analysis FROM jobs WHERE id = :job_id AND user_id = :user_id"),
            {"job_id": job_id, "user_id": user_id}
        )
        job = job_res.fetchone()
        if not job:
            raise AppException(status_code=404, detail="Job not found")

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
            raise AppException(status_code=404, detail="Strategy not found — run strategy generation first")

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
        context = json.dumps({
            "company_name": job.company_name,
            "position": job.position,
            "job_requirements": (job.jd_analysis or {}).get("requirements", []),
            "strategy_text": strategy.strategy_text,
            "gaps": gap_analysis.get("gaps", []),
            "experiences": experiences_context
        }, ensure_ascii=False, default=str)

        prompt = RESUME_SYSTEM
        if data.doc_type == "cover_letter":
            prompt = COVER_LETTER_SYSTEM
        elif data.doc_type == "career_desc":
            prompt = CAREER_DESC_SYSTEM

        # 4. Call LLM — the Critic model (nemotron-3-super) has proven more reliable
        # than the Writer model for larger, more complex generations elsewhere in
        # this app (see defense_engine's question-batch generation).
        generated_content = await self.llm.analyze(system_prompt=prompt, prompt=context, max_tokens=3072)

        # 5. Extract claims. A full resume/cover letter can yield enough claims that
        # the default max_tokens truncates the JSON mid-string (json.loads then
        # fails with "Unterminated string..."), so give this call more headroom.
        # If it still fails, the document itself already generated successfully —
        # save it with no claims rather than discarding real, usable output.
        try:
            extraction = await self.llm.evaluate_json(system_prompt=CLAIM_EXTRACT_SYSTEM, prompt=generated_content, max_tokens=4096)
            claims = extraction.get("claims", [])
        except Exception as e:
            logger.error(f"Claim extraction failed, saving document without claims: {e}")
            claims = []
        
        # 5. Save to generated_documents + claims tables
        doc_id = str(uuid.uuid4())
        await self.db.execute(
            text("""
            INSERT INTO generated_documents (id, job_id, user_id, doc_type, content, version, created_at)
            VALUES (:id, :job_id, :user_id, :doc_type, :content, 1, NOW())
            """),
            {"id": doc_id, "job_id": job_id, "user_id": user_id, "doc_type": data.doc_type, "content": generated_content}
        )
        
        for claim in claims:
            await self.db.execute(
                text("""
                INSERT INTO claims (id, generated_document_id, claim_text, evidence_id, status)
                VALUES (:id, :doc_id, :claim_text, :evidence_id, :status)
                """),
                {
                    "id": str(uuid.uuid4()),
                    "doc_id": doc_id,
                    "claim_text": claim.get("claim_text"),
                    "evidence_id": _as_uuid_or_none(claim.get("evidence_id")),
                    "status": _normalize_claim_status(claim.get("status"))
                }
            )
            
        await self.db.commit()
        
        return {
            "id": doc_id,
            "job_id": job_id,
            "doc_type": data.doc_type,
            "content": generated_content,
            "version": 1,
            "claims_count": len(claims),
            "created_at": "now"
        }

    async def list_documents(self, job_id: str, user_id: str) -> list:
        res = await self.db.execute(
            text("SELECT id, job_id, doc_type, version, created_at FROM generated_documents WHERE job_id = :job_id AND user_id = :user_id"),
            {"job_id": job_id, "user_id": user_id}
        )
        return [{"id": r.id, "job_id": r.job_id, "doc_type": r.doc_type, "version": r.version, "created_at": str(r.created_at)} for r in res.fetchall()]

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
            "id": doc.id,
            "job_id": doc.job_id,
            "doc_type": doc.doc_type,
            "content": doc.content,
            "version": doc.version,
            "claims_count": claims_count,
            "created_at": str(doc.created_at)
        }
