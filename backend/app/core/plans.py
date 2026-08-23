from dataclasses import dataclass

# Everyone gets this many AI actions free per calendar month, regardless of purchased
# credit balance. Credits (below) are only spent once this runs out.
FREE_MONTHLY_QUOTA = 10


@dataclass(frozen=True)
class CreditPack:
    name: str
    amount: int  # KRW, integer — Toss's `Amount.value` for KRW has no decimal places
    credits: int


CREDIT_PACKS: dict[str, CreditPack] = {
    "pack_20": CreditPack(name="AI 이용권 20회", amount=4900, credits=20),
    "pack_50": CreditPack(name="AI 이용권 50회", amount=9900, credits=50),
    "pack_120": CreditPack(name="AI 이용권 120회", amount=19900, credits=120),
}
