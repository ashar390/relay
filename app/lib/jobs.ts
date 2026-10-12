export const jobStatuses = ["queued", "running", "completed", "failed"] as const;

export type JobStatus = (typeof jobStatuses)[number];

export type Job = {
  id: string;
  name: string;
  type: string;
  status: JobStatus;
  createdAt: string;
  attempts: number;
};

export type CreateJobInput = {
  name: string;
  type: string;
};

export function submitJob(input: CreateJobInput): Job {
  const job: Job = {
    id: `job_${crypto.randomUUID()}`,
    name: input.name,
    type: input.type,
    status: "queued",
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  sampleJobs.unshift(job);

  return job;
}

export const sampleJobs: Job[] = [
  {
    id: "job_1042",
    name: "Import customer records",
    type: "customers.import",
    status: "running",
    createdAt: "Just now",
    attempts: 1,
  },
  {
    id: "job_1041",
    name: "Generate import report",
    type: "report.generate",
    status: "queued",
    createdAt: "2 min ago",
    attempts: 0,
  },
  {
    id: "job_1040",
    name: "Send completion email",
    type: "email.send",
    status: "completed",
    createdAt: "8 min ago",
    attempts: 1,
  },
  {
    id: "job_1039",
    name: "Validate customer CSV",
    type: "csv.validate",
    status: "failed",
    createdAt: "12 min ago",
    attempts: 3,
  },
];
