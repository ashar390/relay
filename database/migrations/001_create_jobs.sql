CREATE TYPE job_status AS ENUM (
  'queued',
  'running',
  'completed',
  'failed'
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status job_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

CREATE INDEX jobs_status_created_at_idx
  ON jobs (status, created_at DESC);

CREATE INDEX jobs_type_created_at_idx
  ON jobs (type, created_at DESC);
