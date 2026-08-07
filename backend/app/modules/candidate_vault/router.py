from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.llm_gateway import get_llm_gateway, LLMGateway
from app.core.security import get_current_user
from .service import CandidateVaultService
from .schemas import (
    ExperienceCreate, ExperienceUpdate, ExperienceResponse,
    ExperienceExtractRequest, ExperienceExtractResponse, VaultSummary
)

router = APIRouter()

def get_service(db: AsyncSession = Depends(get_db), llm: LLMGateway = Depends(get_llm_gateway)):
    return CandidateVaultService(db=db, llm=llm)

@router.post("/extract", response_model=ExperienceExtractResponse)
async def extract_experiences(
    request: ExperienceExtractRequest,
    current_user: dict = Depends(get_current_user),
    service: CandidateVaultService = Depends(get_service),
):
    """Extract experiences from a parsed document using AI."""
    return await service.extract_from_document(
        document_id=request.document_id, user_id=current_user["sub"]
    )

@router.get("/summary", response_model=VaultSummary)
async def get_vault_summary(
    current_user: dict = Depends(get_current_user),
    service: CandidateVaultService = Depends(get_service),
):
    """Get a summary of the candidate vault."""
    return await service.get_vault_summary(user_id=current_user["sub"])

@router.get("", response_model=list[ExperienceResponse])
async def list_experiences(
    current_user: dict = Depends(get_current_user),
    service: CandidateVaultService = Depends(get_service),
):
    """List all experiences in the vault."""
    return await service.list_experiences(user_id=current_user["sub"])

@router.post("", response_model=ExperienceResponse)
async def create_experience(
    data: ExperienceCreate,
    current_user: dict = Depends(get_current_user),
    service: CandidateVaultService = Depends(get_service),
):
    """Manually add an experience to the vault."""
    return await service.create_experience(data=data, user_id=current_user["sub"])

@router.get("/{exp_id}", response_model=ExperienceResponse)
async def get_experience(
    exp_id: str,
    current_user: dict = Depends(get_current_user),
    service: CandidateVaultService = Depends(get_service),
):
    """Get a specific experience."""
    return await service.get_experience(exp_id=exp_id, user_id=current_user["sub"])

@router.put("/{exp_id}", response_model=ExperienceResponse)
async def update_experience(
    exp_id: str,
    data: ExperienceUpdate,
    current_user: dict = Depends(get_current_user),
    service: CandidateVaultService = Depends(get_service),
):
    """Update an experience."""
    return await service.update_experience(exp_id=exp_id, data=data, user_id=current_user["sub"])

@router.delete("/{exp_id}")
async def delete_experience(
    exp_id: str,
    current_user: dict = Depends(get_current_user),
    service: CandidateVaultService = Depends(get_service),
):
    """Delete an experience."""
    return await service.delete_experience(exp_id=exp_id, user_id=current_user["sub"])
