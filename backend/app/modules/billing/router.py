from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from .schemas import CheckoutRequest, CheckoutResponse, ConfirmPaymentRequest, CreditPackInfo, UsageResponse
from .service import BillingService

router = APIRouter()


@router.get("/packs", response_model=List[CreditPackInfo])
async def list_packs(db: AsyncSession = Depends(get_db)):
    return BillingService(db).list_packs()


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    data: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.create_checkout(current_user["sub"], data.pack_id)


@router.post("/confirm", response_model=UsageResponse)
async def confirm_payment(
    data: ConfirmPaymentRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.confirm_payment(current_user["sub"], data.payment_key, data.order_id, data.amount)


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = BillingService(db)
    return await service.get_usage(current_user["sub"])
