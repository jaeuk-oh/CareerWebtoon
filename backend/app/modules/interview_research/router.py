from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.core.security import get_current_user
from app.core.usage import check_usage_quota, record_usage
from app.db.session import get_db
from app.services.llm_gateway import LLMGateway, get_llm_gateway
from app.services.search_gateway import SearchGateway, get_search_gateway
from .schemas import InterviewResearchResponse
from .service import InterviewResearchService

router = APIRouter()


def get_service(
    db: AsyncSession = Depends(get_db),
    llm: LLMGateway = Depends(get_llm_gateway),
    search: SearchGateway = Depends(get_search_gateway),
):
    return InterviewResearchService(db=db, llm=llm, search=search)


@router.get("/{job_id}", response_model=InterviewResearchResponse)
async def get_interview_research(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    service: InterviewResearchService = Depends(get_service),
):
    result = await service.get_cached(job_id, current_user["sub"])
    if not result:
        raise AppException(status_code=404, detail="아직 분석된 리서치가 없습니다.")
    return result


@router.post("/{job_id}", response_model=InterviewResearchResponse)
async def run_interview_research(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    service: InterviewResearchService = Depends(get_service),
    db: AsyncSession = Depends(get_db),
):
    result = await service.run_research(job_id, current_user["sub"])
    await record_usage(db, current_user["sub"], "interview_research")
    return result
