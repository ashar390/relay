import postgres from "postgres";
import {
  createJob,
  type CreateJobInput,
  type Job,
  type JobFailure,
  type JobStatus,
} from "./jobs";
import type { JobRepository } from "./job-repository";

type JobRow = {
  id: string;
  name: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  created_at: Date | string;
  attempts: number;
  failure: JobFailure | null;
};

export interface DatabaseClient {
  query<T>(statement: string, parameters?: readonly unknown[]): Promise<T[]>;
}

export function createPostgresClient(connectionString: string): DatabaseClient {
  const sql = postgres(connectionString, {
    max: 5,
    fetch_types: false,
    prepare: true,
  });

  return {
    async query<T>(statement: string, parameters = []): Promise<T[]> {
      return sql.unsafe<T[]>(statement, [...parameters] as never[]);
    },
  };
}

export class PostgresJobRepository implements JobRepository {
  constructor(private readonly database: DatabaseClient) {}

  async list(): Promise<Job[]> {
    const rows = await this.database.query<JobRow>(`
      SELECT id, name, type, payload, status, created_at, attempts, failure
      FROM jobs
      ORDER BY created_at DESC
    `);

    return rows.map(toJob);
  }

  async findById(id: string): Promise<Job | undefined> {
    const [row] = await this.database.query<JobRow>(`
      SELECT id, name, type, payload, status, created_at, attempts, failure
      FROM jobs
      WHERE id = $1
      LIMIT 1
    `, [id]);

    return row ? toJob(row) : undefined;
  }

  async save(input: CreateJobInput): Promise<Job> {
    const job = createJob(input);
    const [row] = await this.database.query<JobRow>(`
      INSERT INTO jobs (id, name, type, payload, status, created_at, attempts)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
      RETURNING id, name, type, payload, status, created_at, attempts, failure
    `, [
      job.id,
      job.name,
      job.type,
      JSON.stringify(job.payload),
      job.status,
      job.createdAt,
      job.attempts,
    ]);

    return toJob(row);
  }

  async removeById(id: string): Promise<void> {
    await this.database.query("DELETE FROM jobs WHERE id = $1", [id]);
  }

  async updateStatus(
    id: string,
    status: JobStatus,
  ): Promise<Job | undefined> {
    const [row] = await this.database.query<JobRow>(`
      UPDATE jobs
      SET
        status = $2,
        attempts = attempts + CASE WHEN $2 = 'running' THEN 1 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP,
        failure = CASE WHEN $2 = 'failed' THEN failure ELSE NULL END
      WHERE id = $1
      RETURNING id, name, type, payload, status, created_at, attempts, failure
    `, [id, status]);

    return row ? toJob(row) : undefined;
  }

  async markFailed(
    id: string,
    failure: JobFailure,
  ): Promise<Job | undefined> {
    const [row] = await this.database.query<JobRow>(`
      UPDATE jobs
      SET
        status = 'failed',
        failure = $2::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, type, payload, status, created_at, attempts, failure
    `, [id, JSON.stringify(failure)]);

    return row ? toJob(row) : undefined;
  }
}

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    payload: row.payload,
    status: row.status,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    attempts: row.attempts,
    failure: row.failure,
  };
}
