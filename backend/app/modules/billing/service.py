import base64
import logging
import uuid

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.plans import CREDIT_PACKS, FREE_MONTHLY_QUOTA
from app.core.usage import current_period_start, get_credit_balance, get_current_usage

logger = logging.getLogger(__name__)

TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm"


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        settings = get_settings()
        self._secret_key = settings.TOSS_SECRET_KEY
        self._client_key = settings.TOSS_CLIENT_KEY

    def list_packs(self) -> list[dict]:
        return [
            {"pack_id": pack_id, "name": pack.name, "amount": pack.amount, "credits": pack.credits}
            for pack_id, pack in CREDIT_PACKS.items()
        ]

    async def create_checkout(self, user_id: str, pack_id: str) -> dict:
        if not self._client_key:
            raise AppException(status_code=503, detail="결제 기능이 아직 설정되지 않았습니다.")
        pack = CREDIT_PACKS.get(pack_id)
        if not pack:
            raise AppException(status_code=404, detail="존재하지 않는 이용권입니다.")

        order_id = f"cc_{uuid.uuid4().hex}"
        await self.db.execute(
            text("""
                INSERT INTO credit_purchases (user_id, order_id, pack_id, amount, credits)
                VALUES (:user_id, :order_id, :pack_id, :amount, :credits)
            """),
            {
                "user_id": user_id,
                "order_id": order_id,
                "pack_id": pack_id,
                "amount": pack.amount,
                "credits": pack.credits,
            },
        )
        return {
            "order_id": order_id,
            "order_name": pack.name,
            "amount": pack.amount,
            "client_key": self._client_key,
        }

    async def confirm_payment(self, user_id: str, payment_key: str, order_id: str, amount: int) -> dict:
        res = await self.db.execute(
            text("""
                SELECT status, amount, credits FROM credit_purchases
                WHERE order_id = :order_id AND user_id = :user_id
            """),
            {"order_id": order_id, "user_id": user_id},
        )
        purchase = res.first()
        if not purchase:
            raise AppException(status_code=404, detail="결제 주문을 찾을 수 없습니다.")

        status, expected_amount, credits = purchase
        if status == "confirmed":
            # Idempotent: a reloaded success page or a duplicate confirm call must not
            # credit the balance twice.
            return await self.get_usage(user_id)
        if expected_amount != amount:
            raise AppException(status_code=400, detail="결제 금액이 일치하지 않습니다.")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                auth = base64.b64encode(f"{self._secret_key}:".encode()).decode()
                response = await client.post(
                    TOSS_CONFIRM_URL,
                    headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
                    json={"paymentKey": payment_key, "orderId": order_id, "amount": amount},
                )
        except httpx.HTTPError as e:
            raise AppException(status_code=503, detail="결제 승인 서버에 연결할 수 없습니다.") from e

        if response.status_code != 200:
            await self.db.execute(
                text("UPDATE credit_purchases SET status = 'failed' WHERE order_id = :order_id"),
                {"order_id": order_id},
            )
            logger.error(f"Toss payment confirm failed for order {order_id}: {response.status_code} {response.text}")
            raise AppException(status_code=402, detail="결제 승인에 실패했습니다.")

        payment = response.json()
        await self.db.execute(
            text("""
                UPDATE credit_purchases
                SET status = 'confirmed', toss_payment_key = :payment_key, confirmed_at = now()
                WHERE order_id = :order_id
            """),
            {"order_id": order_id, "payment_key": payment.get("paymentKey", payment_key)},
        )
        await self.db.execute(
            text("""
                INSERT INTO credit_balance (user_id, balance) VALUES (:user_id, :credits)
                ON CONFLICT (user_id) DO UPDATE SET balance = credit_balance.balance + :credits
            """),
            {"user_id": user_id, "credits": credits},
        )
        return await self.get_usage(user_id)

    async def get_usage(self, user_id: str) -> dict:
        free_used = await get_current_usage(self.db, user_id)
        balance = await get_credit_balance(self.db, user_id)

        period_start = current_period_start()
        resets_at = (
            period_start.replace(year=period_start.year + 1, month=1)
            if period_start.month == 12
            else period_start.replace(month=period_start.month + 1)
        )
        return {
            "free_used": min(free_used, FREE_MONTHLY_QUOTA),
            "free_limit": FREE_MONTHLY_QUOTA,
            "credit_balance": balance,
            "resets_at": resets_at.isoformat(),
        }
