-- Interview research now also links what the web research found about the team to
-- what the applicant actually wrote, so the questions target their specific claims
-- rather than the company in general. Existing rows keep an empty array and get the
-- field populated on their next re-run.
ALTER TABLE interview_research
    ADD COLUMN IF NOT EXISTS personal_angles JSONB NOT NULL DEFAULT '[]';
