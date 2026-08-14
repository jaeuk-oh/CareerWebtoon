import uuid
import json
from sqlalchemy import text
from app.core.exceptions import AppException
from app.services.llm_gateway import LLMGateway
from app.modules.strategy_engine.schemas import StrategyRequest, StrategyResponse
from app.modules.strategy_engine.prompts import STRATEGY_SYSTEM
from app.db.session import get_db

class StrategyEngineService:
    def __init__(self):
        self.llm = LLMGateway()

    async def generate_strategy(self, job_id: str, user_id: str) -> dict:
        async for session in get_db():
            # 1. Fetch matches for this job
            matches_res = await session.execute(
                text("""
                    SELECT m.experience_id, e.title, m.match_score, m.match_type, m.rationale
                    FROM experience_matches m
                    JOIN experiences e ON m.experience_id = e.id
                    WHERE m.job_id = :job_id AND e.user_id = :user_id
                """),
                {"job_id": job_id, "user_id": user_id}
            )
            matches = matches_res.fetchall()
            
            # Fetch job requirements
            job_res = await session.execute(
                text("SELECT jd_analysis FROM jobs WHERE id = :job_id AND user_id = :user_id"),
                {"job_id": job_id, "user_id": user_id}
            )
            job = job_res.fetchone()
            if not job:
                raise AppException(status_code=404, detail="Job not found")
                
            jd_analysis = json.loads(job.jd_analysis) if job.jd_analysis else {}
            
            matches_data = [
                {
                    "experience_id": m.experience_id,
                    "title": m.title,
                    "match_score": m.match_score,
                    "match_type": m.match_type,
                    "rationale": m.rationale
                } for m in matches
            ]
            
            context = f"Job Requirements:\\n{json.dumps(jd_analysis.get('requirements', []), ensure_ascii=False)}\\n\\n"
            context += f"Match Results:\\n{json.dumps(matches_data, ensure_ascii=False)}"

            # 2. Call LLM (critic model, used for evaluation-style tasks)
            strategy_result = await self.llm.evaluate_json(
                prompt=context,
                system_prompt=STRATEGY_SYSTEM
            )

            primary_id = strategy_result.get("primary_experience_id")
            secondary_id = strategy_result.get("secondary_experience_id")
            excluded_ids = strategy_result.get("excluded_ids", [])
            gaps = strategy_result.get("gaps", [])
            strategy_text = strategy_result.get("strategy_text", "")
            
            # Form excluded reasons
            excluded_reasons = [{"experience_id": eid, "reason": "Not selected as primary or secondary, or classified as bilsal."} for eid in excluded_ids if eid]

            strategy_id = str(uuid.uuid4())
            
            # 3. Save to application_strategies table
            await session.execute(
                text("""
                    INSERT INTO application_strategies
                    (id, job_id, user_id, primary_experience_id, secondary_experience_id, gaps, excluded_reasons, strategy_text)
                    VALUES (:id, :job_id, :user_id, :primary_id, :secondary_id, :gaps, :excluded_reasons, :strategy_text)
                """),
                {
                    "id": strategy_id,
                    "job_id": job_id,
                    "user_id": user_id,
                    "primary_id": primary_id,
                    "secondary_id": secondary_id,
                    "gaps": json.dumps(gaps),
                    "excluded_reasons": json.dumps(excluded_reasons),
                    "strategy_text": strategy_text
                }
            )
            await session.commit()
            
            # Fetch exp titles for response
            exp_dict = {m.experience_id: m.title for m in matches}
            
            return {
                "id": strategy_id,
                "job_id": job_id,
                "primary_experience": {"id": primary_id, "title": exp_dict.get(primary_id)} if primary_id else None,
                "secondary_experience": {"id": secondary_id, "title": exp_dict.get(secondary_id)} if secondary_id else None,
                "gaps": gaps,
                "excluded_reasons": excluded_reasons,
                "strategy_text": strategy_text,
                "message": "Strategy generated successfully"
            }

    async def get_strategy(self, job_id: str, user_id: str) -> dict:
        async for session in get_db():
            # Ensure job belongs to user
            job_res = await session.execute(
                text("SELECT id FROM jobs WHERE id = :job_id AND user_id = :user_id"),
                {"job_id": job_id, "user_id": user_id}
            )
            if not job_res.fetchone():
                raise AppException(status_code=404, detail="Job not found")
                
            res = await session.execute(
                text("""
                    SELECT id, primary_experience_id, secondary_experience_id, gaps, excluded_reasons, strategy_text
                    FROM application_strategies
                    WHERE job_id = :job_id
                    ORDER BY created_at DESC LIMIT 1
                """),
                {"job_id": job_id}
            )
            strategy = res.fetchone()
            
            if not strategy:
                raise AppException(status_code=404, detail="Strategy not found")
                
            return {
                "id": strategy.id,
                "job_id": job_id,
                "primary_experience": {"id": strategy.primary_experience_id},
                "secondary_experience": {"id": strategy.secondary_experience_id},
                "gaps": json.loads(strategy.gaps) if strategy.gaps else [],
                "excluded_reasons": json.loads(strategy.excluded_reasons) if strategy.excluded_reasons else [],
                "strategy_text": strategy.strategy_text,
                "message": "Strategy retrieved successfully"
            }
