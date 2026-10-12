import { createJob, type CreateJobInput, type Job } from "./jobs";

const jobs: Job[] = [
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

export function listJobs(): Job[] {
  return [...jobs];
}

export function findJobById(id: string): Job | undefined {
  return jobs.find((job) => job.id === id);
}

export function saveJob(input: CreateJobInput): Job {
  const job = createJob(input);
  jobs.unshift(job);

  return job;
}
