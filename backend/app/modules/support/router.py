from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from .schemas import ContactInquiryCreate, ContactInquiryResponse
from .service import SupportService

router = APIRouter()


@router.post("/inquiries", response_model=ContactInquiryResponse)
async def create_inquiry(
    data: ContactInquiryCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SupportService(db)
    email = data.email or current_user.get("email")
    return await service.create_inquiry(current_user["sub"], email, data.message)
