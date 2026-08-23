from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_current_user
from app.core.usage import check_usage_quota, record_usage
from .schemas import ValidateRequest, ValidationResponse
from .service import EvidenceValidatorService

router = APIRouter(prefix="/validation", tags=["validation"])

@router.post("/", response_model=ValidationResponse)
async def validate_document(
    data: ValidateRequest,
    current_user: dict = Depends(get_current_user),
    _quota: None = Depends(check_usage_quota),
    db: AsyncSession = Depends(get_db)
):
    service = EvidenceValidatorService(db)
    result = await service.validate(data.generated_document_id, current_user["sub"])
    await record_usage(db, current_user["sub"], "evidence_validator")
    return result

@router.get("/{document_id}")
async def get_validation(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = EvidenceValidatorService(db)
    try:
        return await service.get_validation(document_id, current_user["sub"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
