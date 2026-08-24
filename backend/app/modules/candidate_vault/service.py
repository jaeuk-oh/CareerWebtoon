import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException
from app.services.llm_gateway import LLMGateway
from .schemas import ExperienceCreate, ExperienceUpdate

logger = logging.getLogger(__name__)

EXTRACT_SYSTEM_PROMPT = """You are an experience extractor for Korean job application documents.
From the parsed document data, extract individual work experiences, projects, and activities.
Each experience should be a separate entry.

Return JSON with this exact structure:
{
  "experiences": [
    {
      "title": "Project or experience title",
      "company": "Company or organization name",
      "role": "Your role",
      "period": "Date range",
      "description": "Brief description of what you did and achieved",
      "skills": ["skill1", "skill2"]
    }
  ]
}

Rules:
- Extract ALL distinct experiences (work, projects, activities, awards)
- Keep Korean text as-is
- Do NOT invent or embellish information
- Each experience should be atomic (one project = one experience)
- Extract actual skills used/demonstrated"""

class CandidateVaultService:
    def __init__(self, db: AsyncSession, llm: LLMGateway):
        self.db = db
        self.llm = llm

    async def extract_from_document(self, document_id: str, user_id: str) -> dict:
        """Extract experiences from a parsed document using LLM."""
        # Get document
        result = await self.db.execute(
            text("SELECT parsed_data, raw_text FROM documents WHERE id = :id AND user_id = :user_id"),
            {"id": document_id, "user_id": user_id}
        )
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

        parsed_data = json.loads(row[0]) if row[0] else {}
        raw_text = row[1] or ""

        # Use LLM to extract experiences
        prompt = f"""Extract individual experiences from this document data:

Parsed Structure:
{json.dumps(parsed_data, ensure_ascii=False, indent=2)}

Raw Text (first 4000 chars):
{raw_text[:4000]}"""

        try:
            extracted = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=EXTRACT_SYSTEM_PROMPT,
                max_tokens=4096
            )
        except Exception as e:
            logger.error(f"Experience extraction failed: {e}")
            raise HTTPException(status_code=500, detail="경험 추출에 실패했습니다.")

        experiences_data = extracted.get("experiences", [])
        saved_experiences = []

        for exp in experiences_data:
            result = await self.db.execute(
                text("""
                    INSERT INTO experiences (user_id, source_document_id, title, company, role, period, description, skills)
                    VALUES (:user_id, :source_document_id, :title, :company, :role, :period, :description, :skills)
                    RETURNING id, created_at, updated_at
                """),
                {
                    "user_id": user_id,
                    "source_document_id": document_id,
                    "title": exp.get("title", "제목 없음"),
                    "company": exp.get("company"),
                    "role": exp.get("role"),
                    "period": exp.get("period"),
                    "description": exp.get("description"),
                    "skills": exp.get("skills", []),
                }
            )
            r = result.fetchone()
            saved_experiences.append({
                "id": str(r[0]),
                "user_id": user_id,
                "title": exp.get("title", "제목 없음"),
                "company": exp.get("company"),
                "role": exp.get("role"),
                "period": exp.get("period"),
                "description": exp.get("description"),
                "skills": exp.get("skills", []),
                "source_document_id": document_id,
                "created_at": r[1].isoformat() if r[1] else None,
                "updated_at": r[2].isoformat() if r[2] else None,
            })

        return {
            "extracted_count": len(saved_experiences),
            "experiences": saved_experiences,
            "message": f"문서에서 경험 {len(saved_experiences)}건을 추출했습니다."
        }

    async def list_experiences(self, user_id: str) -> list[dict]:
        result = await self.db.execute(
            text("""
                SELECT id, user_id, title, company, role, period, description, skills, source_document_id, created_at, updated_at
                FROM experiences WHERE user_id = :user_id ORDER BY created_at DESC
            """),
            {"user_id": user_id}
        )
        return [
            {
                "id": str(r[0]), "user_id": str(r[1]), "title": r[2], "company": r[3],
                "role": r[4], "period": r[5], "description": r[6],
                "skills": r[7] if r[7] else [], "source_document_id": str(r[8]) if r[8] else None,
                "created_at": r[9].isoformat() if r[9] else None,
                "updated_at": r[10].isoformat() if r[10] else None,
            }
            for r in result.fetchall()
        ]

    async def get_experience(self, exp_id: str, user_id: str) -> dict:
        result = await self.db.execute(
            text("""
                SELECT id, user_id, title, company, role, period, description, skills, source_document_id, created_at, updated_at
                FROM experiences WHERE id = :id AND user_id = :user_id
            """),
            {"id": exp_id, "user_id": user_id}
        )
        r = result.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="경험을 찾을 수 없습니다.")
        return {
            "id": str(r[0]), "user_id": str(r[1]), "title": r[2], "company": r[3],
            "role": r[4], "period": r[5], "description": r[6],
            "skills": r[7] if r[7] else [], "source_document_id": str(r[8]) if r[8] else None,
            "created_at": r[9].isoformat() if r[9] else None,
            "updated_at": r[10].isoformat() if r[10] else None,
        }

    async def create_experience(self, data: ExperienceCreate, user_id: str) -> dict:
        result = await self.db.execute(
            text("""
                INSERT INTO experiences (user_id, source_document_id, title, company, role, period, description, skills)
                VALUES (:user_id, :source_document_id, :title, :company, :role, :period, :description, :skills)
                RETURNING id, created_at, updated_at
            """),
            {
                "user_id": user_id,
                "source_document_id": data.source_document_id,
                "title": data.title,
                "company": data.company,
                "role": data.role,
                "period": data.period,
                "description": data.description,
                "skills": data.skills,
            }
        )
        r = result.fetchone()
        return {
            "id": str(r[0]), "user_id": user_id, "title": data.title,
            "company": data.company, "role": data.role, "period": data.period,
            "description": data.description, "skills": data.skills,
            "source_document_id": data.source_document_id,
            "created_at": r[1].isoformat() if r[1] else None,
            "updated_at": r[2].isoformat() if r[2] else None,
        }

    async def update_experience(self, exp_id: str, data: ExperienceUpdate, user_id: str) -> dict:
        # Build dynamic update
        updates = {}
        if data.title is not None: updates["title"] = data.title
        if data.company is not None: updates["company"] = data.company
        if data.role is not None: updates["role"] = data.role
        if data.period is not None: updates["period"] = data.period
        if data.description is not None: updates["description"] = data.description
        if data.skills is not None: updates["skills"] = data.skills

        if not updates:
            return await self.get_experience(exp_id, user_id)

        set_clauses = ", ".join([f"{k} = :{k}" for k in updates.keys()])
        updates["id"] = exp_id
        updates["user_id"] = user_id

        await self.db.execute(
            text(f"UPDATE experiences SET {set_clauses} WHERE id = :id AND user_id = :user_id"),
            updates
        )
        return await self.get_experience(exp_id, user_id)

    async def delete_experience(self, exp_id: str, user_id: str) -> dict:
        result = await self.db.execute(
            text("DELETE FROM experiences WHERE id = :id AND user_id = :user_id RETURNING id"),
            {"id": exp_id, "user_id": user_id}
        )
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="경험을 찾을 수 없습니다.")
        return {"message": "경험이 삭제되었습니다.", "id": exp_id}

    async def get_vault_summary(self, user_id: str) -> dict:
        exp_result = await self.db.execute(
            text("SELECT COUNT(*), array_agg(DISTINCT unnest_skill) FROM experiences, LATERAL unnest(skills) AS unnest_skill WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        exp_row = exp_result.fetchone()

        doc_result = await self.db.execute(
            text("SELECT COUNT(*) FROM documents WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        doc_count = doc_result.scalar() or 0

        return {
            "total_experiences": exp_row[0] if exp_row else 0,
            "total_documents": doc_count,
            "skills": exp_row[1] if exp_row and exp_row[1] else [],
        }
