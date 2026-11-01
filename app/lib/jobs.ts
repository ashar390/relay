export const jobStatuses = ["queued", "running", "completed", "failed"] as const;

export type JobStatus = (typeof jobStatuses)[number];

export type JobFailure = {
  code: string;
  message: string;
  retryable: boolean;
  occurredAt: string;
};

export type JobEvent = {
  status: JobStatus;
  message: string;
  at: string;
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
  progress: number;
  result: Record<string, unknown> | null;
  updatedAt: string;
  history: JobEvent[];
};

export type CreateJobInput = {
  name: string;
  type: string;
  payload: Record<string, unknown>;
};

export function createJob(input: CreateJobInput): Job {
  const now = new Date().toISOString();

  return {
    id: `job_${crypto.randomUUID()}`,
    name: input.name,
    type: input.type,
    payload: input.payload,
    status: "queued",
    createdAt: now,
    attempts: 0,
    failure: null,
    progress: 0,
    result: null,
    updatedAt: now,
    history: [{ status: "queued", message: "Job accepted", at: now }],
  };
}
