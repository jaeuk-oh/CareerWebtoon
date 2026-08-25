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

# The JD the user actually registered drives one extra query, so the search is
# about the role they're applying for rather than the company in general. Capped
# because Exa charges per query and long queries dilute the match.
MAX_JD_TERMS_IN_QUERY = 4

# The applicant's own material is what turns generic "likely interview questions"
# into questions aimed at their specific claims. Truncated so a long cover letter
# can't crowd the web snippets out of the context window.
MAX_DOC_CHARS = 3000
MAX_EXPERIENCES = 8

# Each cached research row holds a full synthesis plus up to 12 sources. Keeping
# every posting a user ever looked at would grow without bound for no benefit —
# they're preparing for a handful of interviews at a time. Past this, the user is
# asked to delete one rather than having the oldest silently evicted, since the
# row cost real quota to produce.
MAX_CACHED_RESEARCH = 3


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

    async def _get_applicant_context(self, job_id: str, user_id: str) -> dict:
        """
        The applicant's own material: the document they're actually submitting for
        this job, plus their registered experiences. Without this the questions are
        generic "what would this company ask anyone"; with it they can be aimed at
        the specific claims this person is making.
        """
        doc_res = await self.db.execute(
            text("""
                SELECT doc_type, content FROM generated_documents
                WHERE job_id = :job_id AND user_id = :user_id AND content IS NOT NULL
                ORDER BY updated_at DESC LIMIT 1
            """),
            {"job_id": job_id, "user_id": user_id},
        )
        doc = doc_res.first()

        exp_res = await self.db.execute(
            text("""
                SELECT e.title, e.company, e.role, e.period, e.description,
                       COALESCE(array_agg(a.summary) FILTER (WHERE a.summary IS NOT NULL), '{}') AS anchors
                FROM experiences e
                LEFT JOIN experience_anchors a ON a.experience_id = e.id
                WHERE e.user_id = :user_id
                GROUP BY e.id, e.title, e.company, e.role, e.period, e.description, e.created_at
                ORDER BY e.created_at DESC
                LIMIT :limit
            """),
            {"user_id": user_id, "limit": MAX_EXPERIENCES},
        )

        return {
            "document": {
                "doc_type": doc.doc_type,
                "content": (doc.content or "")[:MAX_DOC_CHARS],
            }
            if doc
            else None,
            "experiences": [
                {
                    "title": r.title,
                    "company": r.company,
                    "role": r.role,
                    "period": r.period,
                    "description": r.description,
                    "anchors": list(r.anchors or []),
                }
                for r in exp_res.fetchall()
            ],
        }

    async def _fetch_row(self, job_id: str, user_id: str):
        res = await self.db.execute(
            text("""
                SELECT job_id, web_insights, predicted_questions, keywords, personal_angles,
                       sources, created_at
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
            "personal_angles": row.personal_angles or [],
            "sources": row.sources or [],
            "cached": True,
            "created_at": row.created_at.isoformat(),
        }

    async def list_cached(self, user_id: str) -> list[dict]:
        """Every posting this user has research saved for, newest first."""
        res = await self.db.execute(
            text("""
                SELECT r.job_id, j.company_name, j.position, r.updated_at
                FROM interview_research r
                JOIN jobs j ON j.id = r.job_id
                WHERE r.user_id = :user_id
                ORDER BY r.updated_at DESC
            """),
            {"user_id": user_id},
        )
        return [
            {
                "job_id": str(r.job_id),
                "company_name": r.company_name,
                "position": r.position,
                "updated_at": r.updated_at.isoformat(),
            }
            for r in res.fetchall()
        ]

    async def delete_cached(self, job_id: str, user_id: str) -> None:
        res = await self.db.execute(
            text("DELETE FROM interview_research WHERE job_id = :job_id AND user_id = :user_id"),
            {"job_id": job_id, "user_id": user_id},
        )
        if res.rowcount == 0:
            raise AppException(status_code=404, detail="삭제할 리서치가 없습니다.")

    async def _assert_cache_has_room(self, job_id: str, user_id: str) -> None:
        """
        Re-running research for a posting that already has a row replaces it, so only
        a *new* posting can push the user over the limit. Checked before any search or
        LLM spend, so hitting the limit costs nothing.
        """
        res = await self.db.execute(
            text("""
                SELECT
                    count(*) AS total,
                    count(*) FILTER (WHERE job_id = :job_id) AS this_job
                FROM interview_research WHERE user_id = :user_id
            """),
            {"user_id": user_id, "job_id": job_id},
        )
        row = res.first()
        if row.this_job == 0 and row.total >= MAX_CACHED_RESEARCH:
            raise AppException(
                status_code=409,
                detail=(
                    f"저장할 수 있는 리서치는 최대 {MAX_CACHED_RESEARCH}개입니다. "
                    "기존 리서치를 하나 삭제한 뒤 다시 시도해주세요."
                ),
            )

    async def run_research(self, job_id: str, user_id: str) -> dict:
        job = await self._get_job(job_id, user_id)
        await self._assert_cache_has_room(job_id, user_id)
        company = (job.company_name or "").strip()
        position = (job.position or "").strip()
        if not company:
            raise AppException(status_code=400, detail="회사명이 없는 공고는 웹 리서치를 진행할 수 없습니다.")

        jd_analysis = job.jd_analysis or {}
        requirements = jd_analysis.get("requirements", []) or []
        hidden_requirements = jd_analysis.get("hidden_requirements", []) or []

        queries = [t.format(company=company, position=position).strip() for t in SEARCH_QUERY_TEMPLATES]

        # Search for what this specific JD asks for, not just the company in general.
        # requirements entries are either plain strings or {"requirement": ...} dicts
        # depending on which jd_analyzer run produced them.
        jd_terms: list[str] = []
        for item in requirements[:MAX_JD_TERMS_IN_QUERY]:
            term = item.get("requirement") if isinstance(item, dict) else item
            if isinstance(term, str) and term.strip():
                jd_terms.append(term.strip())
        if jd_terms:
            queries.append(f"{company} {position} {' '.join(jd_terms)}".strip())

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

        applicant = await self._get_applicant_context(job_id, user_id)
        prompt = json.dumps(
            {
                "company": company,
                "position": position,
                "jd_raw_text": (job.jd_raw_text or "")[:MAX_DOC_CHARS],
                "jd_requirements": requirements,
                "jd_hidden_requirements": hidden_requirements,
                "web_snippets": snippets,
                "applicant_document": applicant["document"],
                "applicant_experiences": applicant["experiences"],
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
            # The prompt asks for Korean; this makes the code check it. A live run
            # here returned Japanese connectives spliced into Korean sentences.
            korean_only=True,
        )

        web_insights = result.get("web_insights", [])
        predicted_questions = result.get("predicted_questions", [])
        keywords = result.get("keywords", [])
        personal_angles = result.get("personal_angles", [])

        await self.db.execute(
            text("""
                INSERT INTO interview_research
                    (job_id, user_id, web_insights, predicted_questions, keywords, personal_angles,
                     sources, model_used)
                VALUES (:job_id, :user_id, :web_insights, :predicted_questions, :keywords,
                        :personal_angles, :sources, :model_used)
                ON CONFLICT (job_id) DO UPDATE SET
                    web_insights = :web_insights,
                    predicted_questions = :predicted_questions,
                    keywords = :keywords,
                    personal_angles = :personal_angles,
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
                "personal_angles": json.dumps(personal_angles, ensure_ascii=False),
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
            "personal_angles": row.personal_angles or [],
            "sources": row.sources or [],
            "cached": False,
            "created_at": row.created_at.isoformat(),
        }
