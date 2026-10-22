import {
  createJob,
  type CreateJobInput,
  type Job,
  type JobStatus,
} from "./jobs";

export interface JobRepository {
  list(): Promise<Job[]>;
  findById(id: string): Promise<Job | undefined>;
  save(input: CreateJobInput): Promise<Job>;
  removeById(id: string): Promise<void>;
  updateStatus(id: string, status: JobStatus): Promise<Job | undefined>;
}

class InMemoryJobRepository implements JobRepository {
  private readonly jobs: Job[] = [
    {
      id: "job_1042",
      name: "Import customer records",
      type: "customers.import",
      payload: { fileName: "customers-october.csv" },
      status: "running",
      createdAt: "Just now",
      attempts: 1,
    },
    {
      id: "job_1041",
      name: "Generate import report",
      type: "report.generate",
      payload: { importId: "import_204" },
      status: "queued",
      createdAt: "2 min ago",
      attempts: 0,
    },
    {
      id: "job_1040",
      name: "Send completion email",
      type: "email.send",
      payload: { importId: "import_203" },
      status: "completed",
      createdAt: "8 min ago",
      attempts: 1,
    },
    {
      id: "job_1039",
      name: "Validate customer CSV",
      type: "csv.validate",
      payload: { fileName: "customers-september.csv" },
      status: "failed",
      createdAt: "12 min ago",
      attempts: 3,
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

    if (status === "running") {
      job.attempts += 1;
    }

    return job;
  }
}

export const jobRepository: JobRepository = new InMemoryJobRepository();
