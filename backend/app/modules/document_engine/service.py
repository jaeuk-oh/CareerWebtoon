import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .schemas import GenerateRequest, GeneratedDocResponse
from .prompts import RESUME_SYSTEM, COVER_LETTER_SYSTEM, CAREER_DESC_SYSTEM, CLAIM_EXTRACT_SYSTEM
from app.services.llm_gateway import LLMGateway


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
        
        # 1. Fetch strategy, matches, experiences, evidence, 3c4p for this job
        res_strategy = await self.db.execute(
            text("SELECT * FROM application_strategies WHERE job_id = :job_id AND user_id = :user_id"),
            {"job_id": job_id, "user_id": user_id}
        )
        strategy = res_strategy.fetchone()
        
        # 2. Build context based on doc_type
        context = f"Strategy: {strategy}"
        prompt = RESUME_SYSTEM
        if data.doc_type == "cover_letter":
            prompt = COVER_LETTER_SYSTEM
        elif data.doc_type == "career_desc":
            prompt = CAREER_DESC_SYSTEM
            
        # 3. Call LLM (Writer model)
        generated_content = await self.llm.generate(system_prompt=prompt, prompt=context)

        # 4. Extract claims
        extraction = await self.llm.generate_json(system_prompt=CLAIM_EXTRACT_SYSTEM, prompt=generated_content)
        claims = extraction.get("claims", [])
        
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
