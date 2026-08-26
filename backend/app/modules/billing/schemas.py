from pydantic import BaseModel


class CreditPackInfo(BaseModel):
    pack_id: str
    name: str
    amount: int
    credits: int


class CheckoutRequest(BaseModel):
    pack_id: str


class CheckoutResponse(BaseModel):
    order_id: str
    order_name: str
    amount: int
    client_key: str


class ConfirmPaymentRequest(BaseModel):
    payment_key: str
    order_id: str
    amount: int


class UsageResponse(BaseModel):
    free_used: int
    free_limit: int
    credit_balance: int
    resets_at: str
    # Admin accounts skip the quota entirely (see core/usage.check_usage_quota).
    # Without this the header keeps counting toward a limit that never applies,
    # which reads as "you're blocked" when nothing is actually blocking.
    is_admin: bool = False
