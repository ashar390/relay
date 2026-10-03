export const jobStatuses = ["queued", "running", "completed", "failed"] as const;

export type JobStatus = (typeof jobStatuses)[number];

export type Job = {
  id: string;
  name: string;
  status: JobStatus;
  createdAt: string;
  attempts: number;
};

export const sampleJobs: Job[] = [
  {
    id: "job_1042",
    name: "Import customer records",
    status: "running",
    createdAt: "Just now",
    attempts: 1,
  },
  {
    id: "job_1041",
    name: "Generate import report",
    status: "queued",
    createdAt: "2 min ago",
    attempts: 0,
  },
  {
    id: "job_1040",
    name: "Send completion email",
    status: "completed",
    createdAt: "8 min ago",
    attempts: 1,
  },
  {
    id: "job_1039",
    name: "Validate customer CSV",
    status: "failed",
    createdAt: "12 min ago",
    attempts: 3,
  },
];
