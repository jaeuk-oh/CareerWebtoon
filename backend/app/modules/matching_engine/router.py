from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.modules.matching_engine.schemas import MatchRequest, MatchResponse
from app.modules.matching_engine.service import MatchingEngineService

router = APIRouter()
service = MatchingEngineService()

@router.post("/match", response_model=MatchResponse)
async def match_job(data: MatchRequest, user: dict = Depends(get_current_user)):
    return await service.match(data.job_id, user["sub"])

@router.get("/{job_id}/matches", response_model=MatchResponse)
async def get_matches(job_id: str, user: dict = Depends(get_current_user)):
    return await service.get_matches(job_id, user["sub"])
