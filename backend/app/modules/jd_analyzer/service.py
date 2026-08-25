import uuid
import json
from datetime import datetime
from sqlalchemy import text
from app.core.exceptions import AppException
from app.services.llm_gateway import LLMGateway
from app.modules.jd_analyzer.schemas import JDCreateRequest, JDAnalysisResponse, JobResponse
from app.modules.jd_analyzer.prompts import JD_ANALYSIS_SYSTEM
from app.db.session import get_db

class JDAnalyzerService:
    def __init__(self):
        self.llm = LLMGateway()

    async def analyze_jd(self, data: JDCreateRequest, user_id: str) -> dict:
        prompt = f"Company: {data.company_name}\\nPosition: {data.position}\\nJD Text:\\n{data.jd_raw_text}"
        
        # Extracting/classifying requirements out of a JD is evaluation, not creative
        # writing — the same distinction that moved defense_engine's question batch to
        # the Critic model. Measured directly against this exact prompt: the Writer
        # model (generate_json) took ~48s and regularly tipped over the 60s hard
        # timeout after all 3 retries, while the Critic model (evaluate_json) returned
        # the same structured result in ~17s.
        analysis_result = await self.llm.evaluate_json(
            prompt=prompt,
            system_prompt=JD_ANALYSIS_SYSTEM,
            max_tokens=2048,
            korean_only=True
        )
        
        job_id = str(uuid.uuid4())
        
        async for session in get_db():
            # Save job
            await session.execute(
                text("""
                    INSERT INTO jobs (id, user_id, company_name, position, jd_raw_text, jd_analysis)
                    VALUES (:id, :user_id, :company_name, :position, :jd_raw_text, :jd_analysis)
                """),
                {
                    "id": job_id,
                    "user_id": user_id,
                    "company_name": data.company_name,
                    "position": data.position,
                    "jd_raw_text": data.jd_raw_text,
                    "jd_analysis": json.dumps(analysis_result)
                }
            )
            
            # Save requirements
            reqs = analysis_result.get("requirements", []) + analysis_result.get("hidden_requirements", [])
            for req in reqs:
                req_id = str(uuid.uuid4())
                await session.execute(
                    text("""
                        INSERT INTO job_requirements (id, job_id, competency, priority, is_explicit, description)
                        VALUES (:id, :job_id, :competency, :priority, :is_explicit, :description)
                    """),
                    {
                        "id": req_id,
                        "job_id": job_id,
                        "competency": req.get("competency"),
                        "priority": req.get("priority", 3),
                        "is_explicit": req.get("is_explicit", True),
                        "description": req.get("description", "")
                    }
                )
            
            await session.commit()
            
        return {
            "id": job_id,
            "company_name": data.company_name,
            "position": data.position,
            "requirements": analysis_result.get("requirements", []),
            "hidden_requirements": analysis_result.get("hidden_requirements", []),
            "culture_keywords": analysis_result.get("culture_keywords", []),
            "message": "JD 분석이 완료되었습니다."
        }

    async def list_jobs(self, user_id: str) -> list[dict]:
        async for session in get_db():
            result = await session.execute(
                text("SELECT id, user_id, company_name, position, jd_raw_text, jd_analysis, created_at FROM jobs WHERE user_id = :user_id"),
                {"user_id": user_id}
            )
            jobs = result.fetchall()
            return [
                {
                    "id": str(job.id),
                    "user_id": str(job.user_id),
                    "company_name": job.company_name,
                    "position": job.position,
                    "jd_raw_text": job.jd_raw_text,
                    "jd_analysis": job.jd_analysis or None,
                    "created_at": str(job.created_at)
                }
                for job in jobs
            ]

    async def get_job(self, job_id: str, user_id: str) -> dict:
        async for session in get_db():
            result = await session.execute(
                text("SELECT id, user_id, company_name, position, jd_raw_text, jd_analysis, created_at FROM jobs WHERE id = :id AND user_id = :user_id"),
                {"id": job_id, "user_id": user_id}
            )
            job = result.fetchone()
            if not job:
                raise AppException(status_code=404, detail="채용 공고를 찾을 수 없습니다.")

            return {
                "id": str(job.id),
                "user_id": str(job.user_id),
                "company_name": job.company_name,
                "position": job.position,
                "jd_raw_text": job.jd_raw_text,
                "jd_analysis": job.jd_analysis or None,
                "created_at": str(job.created_at)
            }

    async def delete_job(self, job_id: str, user_id: str) -> dict:
        async for session in get_db():
            result = await session.execute(
                text("DELETE FROM jobs WHERE id = :id AND user_id = :user_id"),
                {"id": job_id, "user_id": user_id}
            )
            if result.rowcount == 0:
                raise AppException(status_code=404, detail="채용 공고를 찾을 수 없습니다.")

            await session.commit()
            return {"message": "채용 공고가 삭제되었습니다."}
