"""
Regression tests for the free-quota + purchased-credit usage gate.

Every LLM-calling endpoint depends on check_usage_quota to block requests once a
caller is out of both their free monthly allowance and any purchased credit balance,
and record_usage to charge one unit after a call succeeds — spending from the free
quota first and only touching the credit balance once that's exhausted. Both run as
plain text() queries against `usage_log`/`credit_balance` (the backend connects
through DATABASE_URL and bypasses Supabase RLS), so a mistake in the query shape or
the >= comparison would silently let usage through un-metered or lock users out early.
"""
import pytest

from app.core.exceptions import AppException
from app.core.plans import FREE_MONTHLY_QUOTA
from app.core.usage import check_usage_quota, get_credit_balance, record_usage

USER = "11111111-1111-1111-1111-111111111111"


class _Result:
    def __init__(self, value):
        self._value = value

    def first(self):
        return self._value

    def scalar_one(self):
        return self._value


class _FakeDB:
    """Minimal stand-in for AsyncSession: routes each query by its SQL text."""

    def __init__(self, usage_count=0, credit_balance=0):
        self._usage_count = usage_count
        self._credit_balance = credit_balance
        self.inserted = []
        self.credit_updates = []

    async def execute(self, stmt, params=None):
        sql = str(stmt)
        if "FROM usage_log" in sql:
            return _Result(self._usage_count)
        if "FROM credit_balance" in sql:
            return _Result((self._credit_balance,) if self._credit_balance is not None else None)
        if "INSERT INTO usage_log" in sql:
            self.inserted.append(params)
            return _Result(None)
        if "UPDATE credit_balance SET balance = balance - 1" in sql:
            self.credit_updates.append(params)
            return _Result(None)
        raise AssertionError(f"unexpected query: {sql}")


async def test_no_credit_balance_row_means_zero():
    db = _FakeDB(credit_balance=None)
    assert await get_credit_balance(db, USER) == 0


async def test_under_free_quota_passes_regardless_of_credits():
    db = _FakeDB(usage_count=FREE_MONTHLY_QUOTA - 1, credit_balance=0)
    await check_usage_quota(current_user={"sub": USER}, db=db)  # must not raise


async def test_over_free_quota_with_no_credits_is_blocked_with_429():
    db = _FakeDB(usage_count=FREE_MONTHLY_QUOTA, credit_balance=0)
    with pytest.raises(AppException) as exc:
        await check_usage_quota(current_user={"sub": USER}, db=db)
    assert exc.value.status_code == 429


async def test_over_free_quota_but_with_credits_passes():
    db = _FakeDB(usage_count=FREE_MONTHLY_QUOTA, credit_balance=5)
    await check_usage_quota(current_user={"sub": USER}, db=db)  # must not raise


async def test_record_usage_within_free_quota_does_not_touch_credits():
    db = _FakeDB(usage_count=FREE_MONTHLY_QUOTA - 1)
    await record_usage(db, USER, "document_engine")
    assert db.inserted == [{"user_id": USER, "module": "document_engine"}]
    assert db.credit_updates == []


async def test_record_usage_past_free_quota_debits_one_credit():
    db = _FakeDB(usage_count=FREE_MONTHLY_QUOTA)  # already at the limit before this call
    await record_usage(db, USER, "document_engine")
    assert db.inserted == [{"user_id": USER, "module": "document_engine"}]
    assert db.credit_updates == [{"user_id": USER}]
