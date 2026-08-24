import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .schemas import DefenseResponse
from .prompts import DEFENSE_SYSTEM, ANSWER_FEEDBACK_SYSTEM
from app.core.ownership import assert_generated_document_owner
from app.services.llm_gateway import LLMGateway

class DefenseEngineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = LLMGateway()

    async def generate_defense(self, generated_document_id: str, user_id: str) -> dict:
        # This writes defense_questions rows keyed to the document's claims, so the
        # caller must own the document before any of it runs.
        await assert_generated_document_owner(self.db, generated_document_id, user_id)

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
        # Generating up to 3 questions per weak claim scales the same way validation
        # does — give it the same headroom rather than relying on 3 retries to get lucky.
        generation = await self.llm.evaluate_json(
            system_prompt=DEFENSE_SYSTEM,
            prompt=str(context),
            max_tokens=8192,
            timeout=120.0
        )
        
        questions_data = generation.get("questions", [])
        
        # defense_questions.claim_id is a NOT NULL foreign key, and the model is free to
        # echo back an id that was never in the prompt. Only accept ids that belong to
        # the weak claims we actually asked about.
        weak_claim_ids = {str(c["id"]) for c in weak_claims}

        response_questions = []
        for q in questions_data:
            claim_id = str(q.get("claim_id") or "")
            if claim_id not in weak_claim_ids:
                continue
            q_id = str(uuid.uuid4())
            # 4. Save to defense_questions table
            await self.db.execute(
                text("""
                INSERT INTO defense_questions (id, claim_id, question, difficulty, expected_answer_hint)
                VALUES (:id, :claim_id, :question, :difficulty, :hint)
                """),
                {
                    "id": q_id,
                    "claim_id": claim_id,
                    "question": q.get("question"),
                    "difficulty": q.get("difficulty"),
                    "hint": q.get("expected_answer_hint")
                }
            )
            response_questions.append({
                "id": q_id,
                "claim_text": next((c["text"] for c in weak_claims if str(c["id"]) == claim_id), ""),
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
            "message": "방어 질문이 생성되었습니다."
        }

    async def get_defense(self, generated_document_id: str, user_id: str) -> dict:
        # Reconstructs previously-generated defense questions from defense_questions
        # (joined through claims, since that's the only FK path to the document) so
        # a returning session can resume the interview-prep list without a fresh
        # LLM call.
        doc_check = await self.db.execute(
            text("SELECT 1 FROM generated_documents WHERE id = :doc_id AND user_id = :user_id"),
            {"doc_id": generated_document_id, "user_id": user_id}
        )
        if not doc_check.first():
            raise ValueError("문서를 찾을 수 없습니다.")

        res = await self.db.execute(
            text("""
            SELECT dq.id, dq.question, dq.difficulty, dq.expected_answer_hint, c.claim_text
            FROM defense_questions dq
            JOIN claims c ON c.id = dq.claim_id
            WHERE c.generated_document_id = :doc_id
            ORDER BY dq.created_at ASC
            """),
            {"doc_id": generated_document_id}
        )
        rows = res.fetchall()
        questions = [
            {
                "id": str(r.id),
                "claim_text": r.claim_text,
                "question": r.question,
                "difficulty": r.difficulty,
                "expected_answer_hint": r.expected_answer_hint
            }
            for r in rows
        ]
        return {
            "document_id": generated_document_id,
            "questions": questions,
            "flagged_claims_count": len(questions),
            "message": "방어 질문을 불러왔습니다." if questions else "아직 생성된 방어 질문이 없습니다."
        }

    async def generate_answer_feedback(
        self, question: str, claim_text: str, expected_answer_hint: str | None, user_answer: str
    ) -> dict:
        context = {
            "question": question,
            "claim_text": claim_text,
            "expected_answer_hint": expected_answer_hint or "",
            "user_answer": user_answer,
        }
        result = await self.llm.evaluate_json(
            system_prompt=ANSWER_FEEDBACK_SYSTEM,
            prompt=str(context),
            max_tokens=512
        )

        feedback = result.get("feedback") or "답변을 다시 한번 구체적으로 정리해보세요."
        is_strong = bool(result.get("is_strong", False))
        try:
            score_delta = max(-5, min(5, int(result.get("score_delta", 0))))
        except (TypeError, ValueError):
            score_delta = 0

        return {"feedback": feedback, "is_strong": is_strong, "score_delta": score_delta}
