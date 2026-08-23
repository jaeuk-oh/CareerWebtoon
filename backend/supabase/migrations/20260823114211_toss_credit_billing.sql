-- Stripe/monthly-subscription-tier billing never went live (no real payment flowed
-- through it) — replaced with Toss Payments one-time top-up credits, which fits a
-- Korean-market product and doesn't need a 정기결제(빌링키) merchant review.
DROP TABLE IF EXISTS subscriptions;

-- Purchased credits, on top of the free monthly quota tracked in usage_log. Credits
-- never expire and are only spent once the free monthly allowance runs out.
CREATE TABLE IF NOT EXISTS credit_balance (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE credit_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own credit balance" ON credit_balance
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- No INSERT/UPDATE policy — only the backend (via DATABASE_URL, which bypasses RLS)
-- credits or debits a balance, after actually confirming a Toss payment.

CREATE TRIGGER update_credit_balance_updated_at BEFORE UPDATE ON credit_balance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- One row per Toss checkout attempt. order_id is what a Toss redirect carries back,
-- and its UNIQUE constraint is what makes payment confirmation idempotent — a
-- reloaded success page or a retried confirm call can't double-credit the balance.
CREATE TABLE IF NOT EXISTS credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    order_id TEXT UNIQUE NOT NULL,
    pack_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    credits INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    toss_payment_key TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_credit_purchases_user ON credit_purchases(user_id);

ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own purchases" ON credit_purchases
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- No write policy here either — a purchase row is only ever created/updated by the
-- backend, from checkout() and confirm_payment().
