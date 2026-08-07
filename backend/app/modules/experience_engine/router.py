from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_current_user
from app.services.llm_gateway import LLMGateway
from app.modules.experience_engine.service import ExperienceEngineService
from app.modules.experience_engine.schemas import DecomposeRequest, DecomposeResponse

router = APIRouter(prefix="/experience-engine", tags=["experience-engine"])

def get_experience_engine_service(db: AsyncSession = Depends(get_db)) -> ExperienceEngineService:
    llm_gateway = LLMGateway()
    return ExperienceEngineService(db=db, llm_gateway=llm_gateway)

@router.post("/decompose", response_model=DecomposeResponse)
async def decompose_experience(
    request: DecomposeRequest,
    current_user: dict = Depends(get_current_user),
    service: ExperienceEngineService = Depends(get_experience_engine_service)
):
    try:
        return await service.decompose(request.experience_id, current_user["sub"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{experience_id}/3c4p")
async def get_3c4p(
    experience_id: str,
    current_user: dict = Depends(get_current_user),
    service: ExperienceEngineService = Depends(get_experience_engine_service)
):
    try:
        result = await service.get_3c4p(experience_id, current_user["sub"])
        if not result:
            raise HTTPException(status_code=404, detail="3C4P data not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{experience_id}/evidence")
async def get_evidence(
    experience_id: str,
    current_user: dict = Depends(get_current_user),
    service: ExperienceEngineService = Depends(get_experience_engine_service)
):
    try:
        return await service.get_evidence(experience_id, current_user["sub"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{experience_id}/anchors")
async def get_anchors(
    experience_id: str,
    current_user: dict = Depends(get_current_user),
    service: ExperienceEngineService = Depends(get_experience_engine_service)
):
    try:
        return await service.get_anchors(experience_id, current_user["sub"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
