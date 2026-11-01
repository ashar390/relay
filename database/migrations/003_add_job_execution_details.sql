ALTER TABLE jobs
ADD COLUMN progress INTEGER NOT NULL DEFAULT 0
  CHECK (progress BETWEEN 0 AND 100),
ADD COLUMN result JSONB,
ADD COLUMN history JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE jobs
ADD CONSTRAINT jobs_result_is_object
CHECK (result IS NULL OR jsonb_typeof(result) = 'object'),
ADD CONSTRAINT jobs_history_is_array
CHECK (jsonb_typeof(history) = 'array');
