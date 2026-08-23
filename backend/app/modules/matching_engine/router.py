from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_current_user
from app.core.usage import check_usage_quota, record_usage
from app.db.session import get_db
from app.modules.matching_engine.schemas import MatchRequest, MatchResponse
from app.modules.matching_engine.service import MatchingEngineService

router = APIRouter()
service = MatchingEngineService()

@router.post("/match", response_model=MatchResponse)
async def match_job(
    data: MatchRequest,
    user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    db: AsyncSession = Depends(get_db),
):
    result = await service.match(data.job_id, user["sub"])
    await record_usage(db, user["sub"], "matching_engine")
    return result

@router.get("/{job_id}/matches", response_model=MatchResponse)
async def get_matches(job_id: str, user: dict = Depends(get_current_user)):
    return await service.get_matches(job_id, user["sub"])
