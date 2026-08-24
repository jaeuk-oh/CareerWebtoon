-- Lightweight support channel for the demo: a user-submitted message the operator
-- reads directly from the Supabase table editor. No email delivery pipeline yet —
-- that's a real integration to provision later, not something worth building for
-- a demo's worth of traffic.
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contact_inquiries_user ON contact_inquiries(user_id);

ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own inquiries" ON contact_inquiries
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policy — only the backend (via DATABASE_URL, which
-- bypasses RLS) writes, same convention as credit_purchases/usage_log.
