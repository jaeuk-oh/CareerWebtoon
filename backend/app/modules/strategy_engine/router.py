from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_current_user
from app.core.usage import check_usage_quota, record_usage
from app.db.session import get_db
from app.modules.strategy_engine.schemas import StrategyRequest, StrategyResponse
from app.modules.strategy_engine.service import StrategyEngineService

router = APIRouter()
service = StrategyEngineService()

@router.post("/strategy", response_model=StrategyResponse)
async def generate_strategy(
    data: StrategyRequest,
    user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    db: AsyncSession = Depends(get_db),
):
    result = await service.generate_strategy(data.job_id, user["sub"])
    await record_usage(db, user["sub"], "strategy_engine")
    return result

@router.get("/{job_id}/strategy", response_model=StrategyResponse)
async def get_strategy(job_id: str, user: dict = Depends(get_current_user)):
    return await service.get_strategy(job_id, user["sub"])
