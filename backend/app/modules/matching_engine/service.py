import uuid
import json
from sqlalchemy import text
from app.core.exceptions import AppException
from app.services.llm_gateway import LLMGateway
from app.modules.matching_engine.schemas import MatchRequest, MatchResponse
from app.modules.matching_engine.prompts import MATCHING_SYSTEM
from app.db.session import get_db

class MatchingEngineService:
    def __init__(self):
        self.llm = LLMGateway()

    async def match(self, job_id: str, user_id: str) -> dict:
        async for session in get_db():
            # Fetch job + requirements
            job_res = await session.execute(
                text("SELECT jd_analysis FROM jobs WHERE id = :id AND user_id = :user_id"),
                {"id": job_id, "user_id": user_id}
            )
            job = job_res.fetchone()
            if not job or not job.jd_analysis:
                raise AppException(status_code=404, detail="Job or JD analysis not found")
            jd_analysis = json.loads(job.jd_analysis)
            
            # Fetch user experiences
            exp_res = await session.execute(
                text("SELECT id, title, description FROM experiences WHERE user_id = :user_id"),
                {"user_id": user_id}
            )
            experiences = exp_res.fetchall()
            
            # Fetch experience anchors
            anchors_res = await session.execute(
                text("""
                    SELECT id, experience_id, anchor_type, summary
                    FROM experience_anchors
                    WHERE experience_id IN (SELECT id FROM experiences WHERE user_id = :user_id)
                """),
                {"user_id": user_id}
            )
            anchors = anchors_res.fetchall()

            exp_dict = {}
            for e in experiences:
                exp_dict[e.id] = {"id": e.id, "title": e.title, "description": e.description, "anchors": []}
            for a in anchors:
                if a.experience_id in exp_dict:
                    exp_dict[a.experience_id]["anchors"].append({
                        "id": a.id, "type": a.anchor_type, "content": a.summary
                    })

            # Build context
            context = f"Job Requirements:\\n{json.dumps(jd_analysis.get('requirements', []), ensure_ascii=False)}\\n\\n"
            context += f"Experiences:\\n{json.dumps(list(exp_dict.values()), ensure_ascii=False)}"

            # Call LLM (critic model, used for evaluation-style tasks)
            match_result = await self.llm.evaluate_json(
                prompt=context,
                system_prompt=MATCHING_SYSTEM
            )

            # Save matches
            matches = match_result.get("matches", [])
            for m in matches:
                match_id = str(uuid.uuid4())
                await session.execute(
                    text("""
                        INSERT INTO experience_matches 
                        (id, job_id, experience_id, anchor_id, match_score, match_type, rationale)
                        VALUES (:id, :job_id, :experience_id, :anchor_id, :match_score, :match_type, :rationale)
                    """),
                    {
                        "id": match_id,
                        "job_id": job_id,
                        "experience_id": m.get("experience_id"),
                        "anchor_id": m.get("anchor_id"),
                        "match_score": m.get("match_score"),
                        "match_type": m.get("match_type"),
                        "rationale": m.get("rationale")
                    }
                )
            
            await session.commit()
            
            return {
                "job_id": job_id,
                "matches": matches,
                "coverage_score": match_result.get("coverage_score", 0.0),
                "message": "Matching completed successfully"
            }

    async def get_matches(self, job_id: str, user_id: str) -> dict:
        async for session in get_db():
            result = await session.execute(
                text("""
                    SELECT m.experience_id, e.title as experience_title, m.anchor_id, a.anchor_type, 
                           m.match_score, m.match_type, m.rationale
                    FROM experience_matches m
                    JOIN experiences e ON m.experience_id = e.id
                    LEFT JOIN experience_anchors a ON m.anchor_id = a.id
                    WHERE m.job_id = :job_id AND e.user_id = :user_id
                """),
                {"job_id": job_id, "user_id": user_id}
            )
            rows = result.fetchall()
            
            if not rows:
                return {"job_id": job_id, "matches": [], "coverage_score": 0.0, "message": "No matches found"}
                
            matches = [
                {
                    "experience_id": r.experience_id,
                    "experience_title": r.experience_title,
                    "anchor_id": r.anchor_id,
                    "anchor_type": r.anchor_type,
                    "match_score": r.match_score,
                    "match_type": r.match_type,
                    "rationale": r.rationale
                }
                for r in rows
            ]
            
            return {
                "job_id": job_id,
                "matches": matches,
                "coverage_score": sum(m["match_score"] for m in matches) / len(matches) if matches else 0.0,
                "message": "Matches retrieved successfully"
            }
