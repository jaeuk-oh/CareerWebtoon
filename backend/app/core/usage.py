from datetime import datetime, timezone

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.plans import FREE_MONTHLY_QUOTA
from app.core.security import get_current_user
from app.db.session import get_db


def _is_admin(email: str | None) -> bool:
    if not email:
        return False
    admin_emails = {e.strip().lower() for e in get_settings().ADMIN_EMAILS.split(",") if e.strip()}
    return email.lower() in admin_emails


def current_period_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


async def get_current_usage(db: AsyncSession, user_id: str) -> int:
    res = await db.execute(
        text("SELECT COUNT(*) FROM usage_log WHERE user_id = :user_id AND created_at >= :period_start"),
        {"user_id": user_id, "period_start": current_period_start()},
    )
    return res.scalar_one()


async def get_credit_balance(db: AsyncSession, user_id: str) -> int:
    res = await db.execute(
        text("SELECT balance FROM credit_balance WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    row = res.first()
    return row[0] if row else 0


async def record_usage(db: AsyncSession, user_id: str, module: str) -> None:
    """
    Record one successful AI action, spending from the caller's free monthly quota
    first and only touching their purchased credit balance once that's exhausted.

    Call this only after the LLM call it's billing for has actually succeeded — a
    failed generation shouldn't cost the user part of their limited allowance.
    """
    free_used_before_this_call = await get_current_usage(db, user_id)
    await db.execute(
        text("INSERT INTO usage_log (user_id, module) VALUES (:user_id, :module)"),
        {"user_id": user_id, "module": module},
    )
    if free_used_before_this_call >= FREE_MONTHLY_QUOTA:
        await db.execute(
            text("UPDATE credit_balance SET balance = balance - 1 WHERE user_id = :user_id AND balance > 0"),
            {"user_id": user_id},
        )


async def check_usage_quota(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Block a request before it reaches the LLM once the caller is out of both free
    monthly quota and purchased credits. Runs as a router dependency alongside
    get_current_user, so the check (and the 429) happens before any LLM cost is
    incurred.
    """
    if _is_admin(current_user.get("email")):
        return
    free_used = await get_current_usage(db, current_user["sub"])
    if free_used < FREE_MONTHLY_QUOTA:
        return
    balance = await get_credit_balance(db, current_user["sub"])
    if balance <= 0:
        raise AppException(
            status_code=429,
            detail=f"이번 달 무료 사용 한도({FREE_MONTHLY_QUOTA}회)를 모두 사용했습니다. 충전 후 계속 이용하실 수 있습니다.",
        )
