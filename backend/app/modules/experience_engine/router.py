import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import AppException
from app.db.session import get_db
from app.core.security import get_current_user
from app.core.usage import check_usage_quota, record_usage
from app.services.llm_gateway import LLMGateway
from app.modules.experience_engine.service import ExperienceEngineService
from app.modules.experience_engine.schemas import DecomposeRequest, DecomposeResponse, SaveThreeCFourPRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/experience-engine", tags=["experience-engine"])

def get_experience_engine_service(db: AsyncSession = Depends(get_db)) -> ExperienceEngineService:
    llm_gateway = LLMGateway()
    return ExperienceEngineService(db=db, llm_gateway=llm_gateway)

# ValueError from the service layer means "not found / not owned" (a real 404).
# Anything else escaping here is an unexpected failure downstream — most often the
# LLM gateway giving up after retries — which is a server/upstream problem, not a
# malformed request, so it must not be reported as 400.
def _raise_mapped(e: Exception):
    # A deliberate status from the service (the grounding guard's 422 for an
    # experience too thin to decompose) already carries the message the user needs.
    # Rewriting it as 502 "잠시 후 다시 시도해주세요" would tell them to retry something
    # that will fail identically until they add more detail.
    if isinstance(e, (AppException, HTTPException)):
        raise e
    if isinstance(e, ValueError):
        raise HTTPException(status_code=404, detail=str(e))
    logger.error(f"experience-engine request failed: {e}")
    raise HTTPException(
        status_code=502,
        detail="AI 분석 요청이 지연되거나 실패했습니다. 잠시 후 다시 시도해주세요."
    )

@router.post("/decompose", response_model=DecomposeResponse)
async def decompose_experience(
    request: DecomposeRequest,
    current_user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    service: ExperienceEngineService = Depends(get_experience_engine_service),
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await service.decompose(request.experience_id, current_user["sub"])
        await record_usage(db, current_user["sub"], "experience_engine")
        return result
    except Exception as e:
        _raise_mapped(e)

@router.put("/{experience_id}/3c4p")
async def save_3c4p(
    experience_id: str,
    data: SaveThreeCFourPRequest,
    current_user: dict = Depends(get_current_user),
    service: ExperienceEngineService = Depends(get_experience_engine_service)
):
    try:
        return await service.save_3c4p(experience_id, current_user["sub"], data)
    except Exception as e:
        _raise_mapped(e)

@router.get("/{experience_id}/3c4p")
async def get_3c4p(
    experience_id: str,
    current_user: dict = Depends(get_current_user),
    service: ExperienceEngineService = Depends(get_experience_engine_service)
):
    try:
        result = await service.get_3c4p(experience_id, current_user["sub"])
        if not result:
            raise HTTPException(status_code=404, detail="3C4P 데이터를 찾을 수 없습니다.")
        return result
    except HTTPException:
        raise
    except Exception as e:
        _raise_mapped(e)

@router.get("/{experience_id}/evidence")
async def get_evidence(
    experience_id: str,
    current_user: dict = Depends(get_current_user),
    service: ExperienceEngineService = Depends(get_experience_engine_service)
):
    try:
        return await service.get_evidence(experience_id, current_user["sub"])
    except Exception as e:
        _raise_mapped(e)

@router.get("/{experience_id}/anchors")
async def get_anchors(
    experience_id: str,
    current_user: dict = Depends(get_current_user),
    service: ExperienceEngineService = Depends(get_experience_engine_service)
):
    try:
        return await service.get_anchors(experience_id, current_user["sub"])
    except Exception as e:
        _raise_mapped(e)
