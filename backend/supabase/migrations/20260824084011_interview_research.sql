-- One cached web-research report per job. Replaces the old JD-text-only "JD
-- Insights" (requirements pulled from the JD alone, no external context) with a
-- real research pass: Exa search across interview reviews, tech blogs, and
-- articles about the company/team, synthesized by the LLM into predicted
-- interview questions, culture/trend insight, and keyword tags.
--
-- One row per job_id (UNIQUE) — re-running the analysis overwrites the row rather
-- than accumulating history, since only the latest research is ever shown. This
-- is what makes it a cache: the frontend only triggers a fresh run when the user
-- explicitly asks, never just from opening the page.
CREATE TABLE IF NOT EXISTS interview_research (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    web_insights JSONB NOT NULL DEFAULT '[]',
    predicted_questions JSONB NOT NULL DEFAULT '[]',
    keywords JSONB NOT NULL DEFAULT '[]',
    sources JSONB NOT NULL DEFAULT '[]',
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_interview_research_job ON interview_research(job_id);

ALTER TABLE interview_research ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own interview research" ON interview_research
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policy — only the backend (via DATABASE_URL, which
-- bypasses RLS) writes, same convention as the other AI-generated tables.

CREATE TRIGGER update_interview_research_updated_at BEFORE UPDATE ON interview_research
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
