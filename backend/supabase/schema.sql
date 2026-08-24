-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Documents (uploaded files)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('resume', 'cover_letter', 'career_desc', 'portfolio', 'other')),
    file_name TEXT,
    file_path TEXT,
    raw_text TEXT,
    parsed_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Experiences (individual work experiences extracted from documents or manually added)
CREATE TABLE IF NOT EXISTS experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    company TEXT,
    role TEXT,
    period TEXT,
    description TEXT,
    skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3C4P decomposition of experiences
CREATE TABLE IF NOT EXISTS experience_3c4p (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE NOT NULL,
    -- 3C
    customer JSONB DEFAULT '{}',
    company_context JSONB DEFAULT '{}',
    competitor JSONB DEFAULT '{}',
    -- 4P
    place JSONB DEFAULT '{}',
    product JSONB DEFAULT '{}',
    price JSONB DEFAULT '{}',
    promotion JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Experience anchors (different angles of same experience)
CREATE TABLE IF NOT EXISTS experience_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE NOT NULL,
    anchor_type TEXT NOT NULL,
    summary TEXT,
    skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Evidence (factual backing for claims)
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE NOT NULL,
    claim TEXT NOT NULL,
    evidence_text TEXT,
    source TEXT,
    status TEXT DEFAULT 'UNKNOWN' CHECK (status IN ('SUPPORTED', 'UNSUPPORTED', 'UNKNOWN')),
    is_quantitative BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Metrics (quantitative data points)
CREATE TABLE IF NOT EXISTS metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE NOT NULL,
    metric_type TEXT CHECK (metric_type IN ('INPUT', 'OUTPUT', 'DERIVED')),
    before_value TEXT,
    after_value TEXT,
    unit TEXT,
    raw_number BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Jobs (JD analysis targets)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT,
    position TEXT,
    jd_raw_text TEXT NOT NULL,
    jd_analysis JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Job requirements (extracted competencies)
CREATE TABLE IF NOT EXISTS job_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    competency TEXT NOT NULL,
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    is_explicit BOOLEAN DEFAULT true,
    description TEXT
);

-- Experience-JD matches
CREATE TABLE IF NOT EXISTS experience_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE NOT NULL,
    anchor_id UUID REFERENCES experience_anchors(id) ON DELETE SET NULL,
    match_score REAL DEFAULT 0,
    match_type TEXT CHECK (match_type IN ('pilsal', 'mipsal', 'bilsal')),
    rationale TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Application strategies
CREATE TABLE IF NOT EXISTS application_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    primary_experience_id UUID REFERENCES experiences(id) ON DELETE SET NULL,
    secondary_experience_id UUID REFERENCES experiences(id) ON DELETE SET NULL,
    excluded_ids UUID[] DEFAULT '{}',
    strategy_text TEXT,
    gap_analysis JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Generated documents (output)
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('resume', 'cover_letter', 'career_desc')),
    content TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Claims (statements in documents that need verification)
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_document_id UUID REFERENCES generated_documents(id) ON DELETE CASCADE,
    claim_text TEXT NOT NULL,
    evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'UNKNOWN' CHECK (status IN ('VERIFIED', 'UNVERIFIED', 'FLAGGED')),
    defense_score REAL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Defense questions (interview simulation)
CREATE TABLE IF NOT EXISTS defense_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    difficulty TEXT DEFAULT 'basic' CHECK (difficulty IN ('basic', 'pressure', 'deep')),
    expected_answer_hint TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- One row per successful AI action (append-only, like evidence/claims). The free
-- monthly quota is computed as COUNT(*) over the current calendar month rather than
-- a periodic reset job.
CREATE TABLE IF NOT EXISTS usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    module TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchased credits (Toss Payments top-up), on top of the free monthly quota above.
-- Kept separate from `profiles` (which the frontend upserts directly with the anon
-- key) so a client can never self-grant a balance — only the backend (via
-- DATABASE_URL, after actually confirming a Toss payment) writes here.
CREATE TABLE IF NOT EXISTS credit_balance (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- One row per Toss checkout attempt. order_id's UNIQUE constraint is what makes
-- payment confirmation idempotent — a reloaded success page can't double-credit.
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

-- Lightweight support channel for the demo: a user-submitted message the operator
-- reads directly from the Supabase table editor. No email delivery pipeline yet.
CREATE TABLE IF NOT EXISTS contact_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_3c4p ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User-owned data isolation
CREATE POLICY "Users manage own profiles" ON profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users manage own documents" ON documents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own experiences" ON experiences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users access own 3c4p" ON experience_3c4p FOR ALL TO authenticated USING (experience_id IN (SELECT id FROM experiences WHERE user_id = auth.uid()));
CREATE POLICY "Users access own anchors" ON experience_anchors FOR ALL TO authenticated USING (experience_id IN (SELECT id FROM experiences WHERE user_id = auth.uid()));
CREATE POLICY "Users access own evidence" ON evidence FOR ALL TO authenticated USING (experience_id IN (SELECT id FROM experiences WHERE user_id = auth.uid()));
CREATE POLICY "Users access own metrics" ON metrics FOR ALL TO authenticated USING (evidence_id IN (SELECT id FROM evidence WHERE experience_id IN (SELECT id FROM experiences WHERE user_id = auth.uid())));
CREATE POLICY "Users manage own jobs" ON jobs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users access own job_requirements" ON job_requirements FOR ALL TO authenticated USING (job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid()));
CREATE POLICY "Users access own matches" ON experience_matches FOR ALL TO authenticated USING (job_id IN (SELECT id FROM jobs WHERE user_id = auth.uid()));
CREATE POLICY "Users manage own strategies" ON application_strategies FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own generated_docs" ON generated_documents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users access own claims" ON claims FOR ALL TO authenticated USING (generated_document_id IN (SELECT id FROM generated_documents WHERE user_id = auth.uid()));
CREATE POLICY "Users access own defense_questions" ON defense_questions FOR ALL TO authenticated USING (claim_id IN (SELECT id FROM claims WHERE generated_document_id IN (SELECT id FROM generated_documents WHERE user_id = auth.uid())));
-- usage_log/credit_balance/credit_purchases: read-only for authenticated users. No
-- INSERT/UPDATE/DELETE policy is intentional — only the backend (via DATABASE_URL,
-- which bypasses RLS) writes, and only after actually confirming a Toss payment.
CREATE POLICY "Users read own usage" ON usage_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own credit balance" ON credit_balance FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own purchases" ON credit_purchases FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users read own inquiries" ON contact_inquiries FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_experiences_user_id ON experiences(user_id);
CREATE INDEX idx_experience_3c4p_experience_id ON experience_3c4p(experience_id);
CREATE INDEX idx_experience_anchors_experience_id ON experience_anchors(experience_id);
CREATE INDEX idx_evidence_experience_id ON evidence(experience_id);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_experience_matches_job_id ON experience_matches(job_id);
CREATE INDEX idx_generated_documents_user_id ON generated_documents(user_id);
CREATE INDEX idx_claims_generated_document_id ON claims(generated_document_id);
CREATE INDEX idx_usage_log_user_created ON usage_log(user_id, created_at);
CREATE INDEX idx_credit_purchases_user ON credit_purchases(user_id);
CREATE INDEX idx_contact_inquiries_user ON contact_inquiries(user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON experiences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_application_strategies_updated_at BEFORE UPDATE ON application_strategies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_generated_documents_updated_at BEFORE UPDATE ON generated_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_balance_updated_at BEFORE UPDATE ON credit_balance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
