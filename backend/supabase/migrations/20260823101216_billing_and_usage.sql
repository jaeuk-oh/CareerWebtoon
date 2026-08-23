-- 구독/결제 상태. profiles와 분리 — profiles는 프론트가 anon key로 직접 upsert하므로
-- tier를 여기 두면 클라이언트가 스스로 paid로 바꿀 수 있다. 오직 서비스 롤(백엔드의
-- Stripe 웹훅)만 이 테이블에 쓸 수 있도록 authenticated에는 SELECT 정책만 준다.
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- INSERT/UPDATE/DELETE 정책 없음 = authenticated role은 쓰기 불가.

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 성공한 AI 액션 1건당 1행. evidence/claims와 같은 append-only 스타일 —
-- 리셋 배치 없이 COUNT(*) WHERE created_at >= 이번달 1일 로 사용량을 계산한다.
CREATE TABLE IF NOT EXISTS usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    module TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_log_user_created ON usage_log(user_id, created_at);

ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON usage_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- 여기도 authenticated INSERT 정책 없음 — 오직 백엔드만 기록.
