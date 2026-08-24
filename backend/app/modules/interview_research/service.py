import json
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.services.llm_gateway import LLMGateway
from app.services.search_gateway import SearchGateway
from .prompts import INTERVIEW_RESEARCH_SYSTEM

logger = logging.getLogger(__name__)

# Number of distinct Exa queries run per company/JD, and the cap on how many
# deduplicated sources (across all queries) get fed into the synthesis prompt.
SEARCH_QUERY_TEMPLATES = [
    "{company} {position} 면접 후기",
    "{company} 기술 블로그 조직 문화",
    "{company} 인터뷰 채용 인재상",
]
MAX_SOURCES = 12


class InterviewResearchService:
    def __init__(self, db: AsyncSession, llm: LLMGateway, search: SearchGateway):
        self.db = db
        self.llm = llm
        self.search = search

    async def _get_job(self, job_id: str, user_id: str):
        res = await self.db.execute(
            text("SELECT company_name, position, jd_raw_text, jd_analysis FROM jobs WHERE id = :job_id AND user_id = :user_id"),
            {"job_id": job_id, "user_id": user_id},
        )
        job = res.first()
        if not job:
            raise AppException(status_code=404, detail="채용 공고를 찾을 수 없습니다.")
        return job

    async def _fetch_row(self, job_id: str, user_id: str):
        res = await self.db.execute(
            text("""
                SELECT job_id, web_insights, predicted_questions, keywords, sources, created_at
                FROM interview_research WHERE job_id = :job_id AND user_id = :user_id
            """),
            {"job_id": job_id, "user_id": user_id},
        )
        return res.first()

    async def get_cached(self, job_id: str, user_id: str) -> dict | None:
        row = await self._fetch_row(job_id, user_id)
        if not row:
            return None
        return {
            "job_id": str(row.job_id),
            "web_insights": row.web_insights or [],
            "predicted_questions": row.predicted_questions or [],
            "keywords": row.keywords or [],
            "sources": row.sources or [],
            "cached": True,
            "created_at": row.created_at.isoformat(),
        }

    async def run_research(self, job_id: str, user_id: str) -> dict:
        job = await self._get_job(job_id, user_id)
        company = (job.company_name or "").strip()
        position = (job.position or "").strip()
        if not company:
            raise AppException(status_code=400, detail="회사명이 없는 공고는 웹 리서치를 진행할 수 없습니다.")

        queries = [t.format(company=company, position=position).strip() for t in SEARCH_QUERY_TEMPLATES]

        seen_urls: set[str] = set()
        snippets: list[str] = []
        sources: list[dict] = []
        for query in queries:
            for r in await self.search.search(query, num_results=5):
                if not r.url or r.url in seen_urls:
                    continue
                if len(sources) >= MAX_SOURCES:
                    break
                seen_urls.add(r.url)
                sources.append({"title": r.title, "url": r.url})
                highlight_text = " / ".join(r.highlights) if r.highlights else ""
                snippets.append(f"[{r.title}]({r.url})\n{highlight_text}")

        jd_analysis = job.jd_analysis or {}
        prompt = json.dumps(
            {
                "company": company,
                "position": position,
                "jd_requirements": jd_analysis.get("requirements", []),
                "jd_hidden_requirements": jd_analysis.get("hidden_requirements", []),
                "web_snippets": snippets,
            },
            ensure_ascii=False,
        )

        result = await self.llm.evaluate_json(
            prompt=prompt,
            system_prompt=INTERVIEW_RESEARCH_SYSTEM,
            # Korean output plus up to 12 sources' worth of insights/questions/keywords
            # runs noticeably longer than other evaluate_json calls in this codebase —
            # 4096 truncated mid-JSON in testing.
            max_tokens=8192,
        )

        web_insights = result.get("web_insights", [])
        predicted_questions = result.get("predicted_questions", [])
        keywords = result.get("keywords", [])

        await self.db.execute(
            text("""
                INSERT INTO interview_research
                    (job_id, user_id, web_insights, predicted_questions, keywords, sources, model_used)
                VALUES (:job_id, :user_id, :web_insights, :predicted_questions, :keywords, :sources, :model_used)
                ON CONFLICT (job_id) DO UPDATE SET
                    web_insights = :web_insights,
                    predicted_questions = :predicted_questions,
                    keywords = :keywords,
                    sources = :sources,
                    model_used = :model_used,
                    updated_at = now()
            """),
            {
                "job_id": job_id,
                "user_id": user_id,
                "web_insights": json.dumps(web_insights, ensure_ascii=False),
                "predicted_questions": json.dumps(predicted_questions, ensure_ascii=False),
                "keywords": json.dumps(keywords, ensure_ascii=False),
                "sources": json.dumps(sources, ensure_ascii=False),
                "model_used": self.llm.CRITIC_MODEL,
            },
        )

        row = await self._fetch_row(job_id, user_id)
        return {
            "job_id": str(row.job_id),
            "web_insights": row.web_insights or [],
            "predicted_questions": row.predicted_questions or [],
            "keywords": row.keywords or [],
            "sources": row.sources or [],
            "cached": False,
            "created_at": row.created_at.isoformat(),
        }
