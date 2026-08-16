import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .schemas import DefenseResponse
from .prompts import DEFENSE_SYSTEM
from app.services.llm_gateway import LLMGateway

class DefenseEngineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMGateway()

    async def generate_defense(self, generated_document_id: str, user_id: str) -> dict:
        # 1. Fetch claims for the document
        res_claims = await self.db.execute(
            text("""
            SELECT id, claim_text, status, defense_score 
            FROM claims 
            WHERE generated_document_id = :doc_id
            """),
            {"doc_id": generated_document_id}
        )
        claims = [{"id": r.id, "text": r.claim_text, "status": r.status, "score": r.defense_score} for r in res_claims.fetchall()]
        
        # 2. Focus on FLAGGED and low defense_score claims
        weak_claims = [c for c in claims if c["status"] in ("FLAGGED", "UNVERIFIED") or (c["score"] is not None and c["score"] < 0.6)]
        
        # 3. Call LLM to generate interview questions (critic model: this is an
        # evaluation of weak claims, not creative writing, and proved far more
        # reliable than the writer model for this batch size)
        context = {"weak_claims": weak_claims}
        generation = await self.llm.evaluate_json(
            system_prompt=DEFENSE_SYSTEM,
            prompt=str(context),
            max_tokens=8192
        )
        
        questions_data = generation.get("questions", [])
        
        response_questions = []
        for q in questions_data:
            q_id = str(uuid.uuid4())
            # 4. Save to defense_questions table
            await self.db.execute(
                text("""
                INSERT INTO defense_questions (id, claim_id, question, difficulty, expected_answer_hint)
                VALUES (:id, :claim_id, :question, :difficulty, :hint)
                """),
                {
                    "id": q_id,
                    "claim_id": q.get("claim_id"),
                    "question": q.get("question"),
                    "difficulty": q.get("difficulty"),
                    "hint": q.get("expected_answer_hint")
                }
            )
            response_questions.append({
                "id": q_id,
                "claim_text": next((c["text"] for c in weak_claims if str(c["id"]) == str(q.get("claim_id"))), ""),
                "question": q.get("question"),
                "difficulty": q.get("difficulty"),
                "expected_answer_hint": q.get("expected_answer_hint")
            })
            
        await self.db.commit()
        
        # 5. Return DefenseResponse
        return {
            "document_id": generated_document_id,
            "questions": response_questions,
            "flagged_claims_count": len(weak_claims),
            "message": "Defense questions generated successfully."
        }

    async def get_defense(self, generated_document_id: str, user_id: str) -> dict:
        # Placeholder for fetch logic
        return {"document_id": generated_document_id}
