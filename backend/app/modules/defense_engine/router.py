from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import get_current_user
from .schemas import DefenseRequest, DefenseResponse, AnswerFeedbackRequest, AnswerFeedbackResponse
from .service import DefenseEngineService

router = APIRouter(prefix="/defense", tags=["defense"])

@router.post("/", response_model=DefenseResponse)
async def generate_defense(
    data: DefenseRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DefenseEngineService(db)
    return await service.generate_defense(data.generated_document_id, current_user["sub"])

@router.post("/answer", response_model=AnswerFeedbackResponse)
async def answer_feedback(
    data: AnswerFeedbackRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DefenseEngineService(db)
    return await service.generate_answer_feedback(
        question=data.question,
        claim_text=data.claim_text,
        expected_answer_hint=data.expected_answer_hint,
        user_answer=data.user_answer,
    )

@router.get("/{document_id}")
async def get_defense(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DefenseEngineService(db)
    return await service.get_defense(document_id, current_user["sub"])
