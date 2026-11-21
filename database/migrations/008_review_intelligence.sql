ALTER TABLE findings ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'gemini';
ALTER TABLE findings ADD COLUMN IF NOT EXISTS confidence REAL NOT NULL DEFAULT 0.6;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS evidence TEXT NOT NULL DEFAULT '';
ALTER TABLE findings ADD COLUMN IF NOT EXISTS context_files JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE findings ADD COLUMN IF NOT EXISTS feedback VARCHAR(20);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'findings_source_valid') THEN
    ALTER TABLE findings ADD CONSTRAINT findings_source_valid CHECK (source IN ('semgrep', 'gemini'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'findings_confidence_valid') THEN
    ALTER TABLE findings ADD CONSTRAINT findings_confidence_valid CHECK (confidence >= 0 AND confidence <= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'findings_feedback_valid') THEN
    ALTER TABLE findings ADD CONSTRAINT findings_feedback_valid CHECK (feedback IS NULL OR feedback IN ('useful', 'incorrect', 'duplicate'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_findings_feedback ON findings(feedback) WHERE feedback IS NOT NULL;

CREATE TABLE IF NOT EXISTS evaluation_cases (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER REFERENCES github_users(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  input_files JSONB NOT NULL,
  expected_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS evaluation_runs (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER REFERENCES github_users(id) ON DELETE CASCADE,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  case_id INTEGER REFERENCES evaluation_cases(id) ON DELETE CASCADE,
  system_version VARCHAR(80) NOT NULL,
  result_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eval_cases_owner ON evaluation_cases(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_runs_owner ON evaluation_runs(owner_user_id, created_at DESC);
