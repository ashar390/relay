import postgres from "postgres";
import {
  createJob,
  type CreateJobInput,
  type Job,
  type JobFailure,
  type JobEvent,
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
  progress: number;
  result: Record<string, unknown> | null;
  updated_at: Date | string;
  history: JobEvent[];
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
      SELECT id, name, type, payload, status, created_at, attempts, failure,
             progress, result, updated_at, history
      FROM jobs
      ORDER BY created_at DESC
    `);

    return rows.map(toJob);
  }

  async findById(id: string): Promise<Job | undefined> {
    const [row] = await this.database.query<JobRow>(`
      SELECT id, name, type, payload, status, created_at, attempts, failure,
             progress, result, updated_at, history
      FROM jobs
      WHERE id = $1
      LIMIT 1
    `, [id]);

    return row ? toJob(row) : undefined;
  }

  async save(input: CreateJobInput): Promise<Job> {
    const job = createJob(input);
    const [row] = await this.database.query<JobRow>(`
      INSERT INTO jobs (
        id, name, type, payload, status, created_at, attempts,
        progress, result, updated_at, history
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb)
      RETURNING id, name, type, payload, status, created_at, attempts, failure,
                progress, result, updated_at, history
    `, [
      job.id,
      job.name,
      job.type,
      JSON.stringify(job.payload),
      job.status,
      job.createdAt,
      job.attempts,
      job.progress,
      JSON.stringify(job.result),
      job.updatedAt,
      JSON.stringify(job.history),
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
        failure = CASE WHEN $2 = 'failed' THEN failure ELSE NULL END,
        progress = CASE WHEN $2 = 'queued' THEN 0 ELSE progress END,
        result = CASE WHEN $2 = 'queued' THEN NULL ELSE result END,
        history = history || jsonb_build_array(jsonb_build_object(
          'status', $2,
          'message', CASE $2
            WHEN 'queued' THEN 'Job queued for processing'
            WHEN 'running' THEN 'Worker started processing'
            WHEN 'completed' THEN 'Job completed'
            ELSE 'Job failed'
          END,
          'at', CURRENT_TIMESTAMP
        ))
      WHERE id = $1
      RETURNING id, name, type, payload, status, created_at, attempts, failure,
                progress, result, updated_at, history
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
        updated_at = CURRENT_TIMESTAMP,
        history = history || jsonb_build_array(jsonb_build_object(
          'status', 'failed',
          'message', $3,
          'at', CURRENT_TIMESTAMP
        ))
      WHERE id = $1
      RETURNING id, name, type, payload, status, created_at, attempts, failure,
                progress, result, updated_at, history
    `, [id, JSON.stringify(failure), failure.message]);

    return row ? toJob(row) : undefined;
  }

  async updateProgress(
    id: string,
    progress: number,
    message: string,
  ): Promise<Job | undefined> {
    const boundedProgress = Math.max(0, Math.min(100, progress));
    const [row] = await this.database.query<JobRow>(`
      UPDATE jobs
      SET
        progress = $2,
        updated_at = CURRENT_TIMESTAMP,
        history = history || jsonb_build_array(jsonb_build_object(
          'status', 'running',
          'message', $3,
          'at', CURRENT_TIMESTAMP
        ))
      WHERE id = $1
      RETURNING id, name, type, payload, status, created_at, attempts, failure,
                progress, result, updated_at, history
    `, [id, boundedProgress, message]);

    return row ? toJob(row) : undefined;
  }

  async complete(
    id: string,
    result: Record<string, unknown>,
  ): Promise<Job | undefined> {
    const [row] = await this.database.query<JobRow>(`
      UPDATE jobs
      SET
        status = 'completed',
        progress = 100,
        result = $2::jsonb,
        failure = NULL,
        updated_at = CURRENT_TIMESTAMP,
        history = history || jsonb_build_array(jsonb_build_object(
          'status', 'completed',
          'message', 'Job completed',
          'at', CURRENT_TIMESTAMP
        ))
      WHERE id = $1
      RETURNING id, name, type, payload, status, created_at, attempts, failure,
                progress, result, updated_at, history
    `, [id, JSON.stringify(result)]);

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
    progress: row.progress,
    result: row.result,
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row.updated_at,
    history: row.history,
  };
}
