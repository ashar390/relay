ALTER TABLE jobs
ADD COLUMN failure JSONB;

ALTER TABLE jobs
ADD CONSTRAINT jobs_failure_is_object
CHECK (failure IS NULL OR jsonb_typeof(failure) = 'object');
