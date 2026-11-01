import {
  createJob,
  type CreateJobInput,
  type Job,
  type JobFailure,
  type JobStatus,
} from "./jobs";

export interface JobRepository {
  list(): Promise<Job[]>;
  findById(id: string): Promise<Job | undefined>;
  save(input: CreateJobInput): Promise<Job>;
  removeById(id: string): Promise<void>;
  updateStatus(id: string, status: JobStatus): Promise<Job | undefined>;
  markFailed(id: string, failure: JobFailure): Promise<Job | undefined>;
  updateProgress(id: string, progress: number, message: string): Promise<Job | undefined>;
  complete(id: string, result: Record<string, unknown>): Promise<Job | undefined>;
}

export class InMemoryJobRepository implements JobRepository {
  private readonly jobs: Job[] = [
    {
      id: "job_1042",
      name: "Import customer records",
      type: "customers.import",
      payload: { fileName: "customers-october.csv" },
      status: "running",
      createdAt: "Just now",
      attempts: 1,
      failure: null,
      progress: 45,
      result: null,
      updatedAt: "Just now",
      history: [
        { status: "queued", message: "Job accepted", at: "1 min ago" },
        { status: "running", message: "Worker started processing", at: "Just now" },
      ],
    },
    {
      id: "job_1041",
      name: "Generate import report",
      type: "report.generate",
      payload: { importId: "import_204" },
      status: "queued",
      createdAt: "2 min ago",
      attempts: 0,
      failure: null,
      progress: 0,
      result: null,
      updatedAt: "2 min ago",
      history: [{ status: "queued", message: "Job accepted", at: "2 min ago" }],
    },
    {
      id: "job_1040",
      name: "Send completion email",
      type: "email.send",
      payload: { importId: "import_203" },
      status: "completed",
      createdAt: "8 min ago",
      attempts: 1,
      failure: null,
      progress: 100,
      result: { deliveryStatus: "accepted", importId: "import_203" },
      updatedAt: "7 min ago",
      history: [
        { status: "queued", message: "Job accepted", at: "8 min ago" },
        { status: "completed", message: "Job completed", at: "7 min ago" },
      ],
    },
    {
      id: "job_1039",
      name: "Validate customer CSV",
      type: "csv.validate",
      payload: { fileName: "customers-september.csv" },
      status: "failed",
      createdAt: "12 min ago",
      attempts: 3,
      failure: {
        code: "INVALID_JOB_PAYLOAD",
        message: "csv.validate requires payload.fileName",
        retryable: false,
        occurredAt: "12 min ago",
      },
      progress: 20,
      result: null,
      updatedAt: "12 min ago",
      history: [
        { status: "queued", message: "Job accepted", at: "14 min ago" },
        { status: "failed", message: "csv.validate requires payload.fileName", at: "12 min ago" },
      ],
    },
  ];

  async list(): Promise<Job[]> {
    return [...this.jobs];
  }

  async findById(id: string): Promise<Job | undefined> {
    return this.jobs.find((job) => job.id === id);
  }

  async save(input: CreateJobInput): Promise<Job> {
    const job = createJob(input);
    this.jobs.unshift(job);

    return job;
  }

  async removeById(id: string): Promise<void> {
    const index = this.jobs.findIndex((job) => job.id === id);

    if (index !== -1) {
      this.jobs.splice(index, 1);
    }
  }

  async updateStatus(
    id: string,
    status: JobStatus,
  ): Promise<Job | undefined> {
    const job = await this.findById(id);

    if (!job) {
      return undefined;
    }

    job.status = status;
    job.updatedAt = new Date().toISOString();

    if (status === "running") {
      job.attempts += 1;
    }

    if (status !== "failed") {
      job.failure = null;
    }

    if (status === "queued") {
      job.progress = 0;
      job.result = null;
    }

    job.history.push({
      status,
      message: statusMessage(status),
      at: job.updatedAt,
    });

    return job;
  }

  async markFailed(
    id: string,
    failure: JobFailure,
  ): Promise<Job | undefined> {
    const job = await this.findById(id);

    if (!job) {
      return undefined;
    }

    job.status = "failed";
    job.failure = failure;
    job.updatedAt = failure.occurredAt;
    job.history.push({
      status: "failed",
      message: failure.message,
      at: failure.occurredAt,
    });

    return job;
  }

  async updateProgress(
    id: string,
    progress: number,
    message: string,
  ): Promise<Job | undefined> {
    const job = await this.findById(id);

    if (!job) {
      return undefined;
    }

    job.progress = Math.max(0, Math.min(100, progress));
    job.updatedAt = new Date().toISOString();
    job.history.push({ status: "running", message, at: job.updatedAt });

    return job;
  }

  async complete(
    id: string,
    result: Record<string, unknown>,
  ): Promise<Job | undefined> {
    const job = await this.findById(id);

    if (!job) {
      return undefined;
    }

    job.status = "completed";
    job.progress = 100;
    job.result = result;
    job.failure = null;
    job.updatedAt = new Date().toISOString();
    job.history.push({
      status: "completed",
      message: "Job completed",
      at: job.updatedAt,
    });

    return job;
  }
}

function statusMessage(status: JobStatus): string {
  const messages: Record<JobStatus, string> = {
    queued: "Job queued for processing",
    running: "Worker started processing",
    completed: "Job completed",
    failed: "Job failed",
  };

  return messages[status];
}

export const inMemoryJobRepository: JobRepository = new InMemoryJobRepository();
