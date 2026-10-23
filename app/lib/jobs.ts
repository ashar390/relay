export const jobStatuses = ["queued", "running", "completed", "failed"] as const;

export type JobStatus = (typeof jobStatuses)[number];

export type JobFailure = {
  code: string;
  message: string;
  retryable: boolean;
  occurredAt: string;
};

export type Job = {
  id: string;
  name: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  createdAt: string;
  attempts: number;
  failure: JobFailure | null;
};

export type CreateJobInput = {
  name: string;
  type: string;
  payload: Record<string, unknown>;
};

export function createJob(input: CreateJobInput): Job {
  return {
    id: `job_${crypto.randomUUID()}`,
    name: input.name,
    type: input.type,
    payload: input.payload,
    status: "queued",
    createdAt: new Date().toISOString(),
    attempts: 0,
    failure: null,
  };
}
