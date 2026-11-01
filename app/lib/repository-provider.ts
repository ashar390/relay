import { inMemoryJobRepository, type JobRepository } from "./job-repository";
import {
  createPostgresClient,
  PostgresJobRepository,
} from "./postgres-job-repository";
import { getOptionalRuntimeBindings } from "./runtime-bindings";

export function getJobRepository(): JobRepository {
  const connectionString =
    getOptionalRuntimeBindings()?.HYPERDRIVE?.connectionString;

  if (!connectionString) {
    return inMemoryJobRepository;
  }

  return new PostgresJobRepository(createPostgresClient(connectionString));
}
