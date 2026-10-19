import type { Job } from "./jobs";
import { getRuntimeBindings } from "./runtime-bindings";

export type JobQueueMessage = Pick<
  Job,
  "id" | "type" | "payload" | "createdAt"
>;

export async function enqueueJob(job: Job): Promise<void> {
  const { JOB_QUEUE } = getRuntimeBindings();
  const message: JobQueueMessage = {
    id: job.id,
    type: job.type,
    payload: job.payload,
    createdAt: job.createdAt,
  };

  await JOB_QUEUE.send(message, { contentType: "json" });
}
