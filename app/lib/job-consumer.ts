import type { JobQueueMessage } from "./job-queue";
import { jobRepository } from "./job-repository";

const RETRY_DELAY_SECONDS = 30;

export type ConsumableJobMessage = {
  body: JobQueueMessage;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};

export type JobMessageBatch = {
  messages: readonly ConsumableJobMessage[];
};

export async function consumeJobBatch(batch: JobMessageBatch): Promise<void> {
  for (const message of batch.messages) {
    try {
      await processJob(message.body);
      message.ack();
    } catch {
      await jobRepository.updateStatus(message.body.id, "failed");
      message.retry({ delaySeconds: RETRY_DELAY_SECONDS });
    }
  }
}

async function processJob(message: JobQueueMessage): Promise<void> {
  const job = await jobRepository.updateStatus(message.id, "running");

  if (!job) {
    throw new Error(`Job ${message.id} was not found`);
  }

  validateSupportedPayload(message);
  await jobRepository.updateStatus(message.id, "completed");
}

function validateSupportedPayload(message: JobQueueMessage): void {
  const requiredFields: Record<string, string> = {
    "customers.import": "fileName",
    "csv.validate": "fileName",
    "report.generate": "importId",
    "email.send": "importId",
    "invoice.generate": "customerId",
  };
  const requiredField = requiredFields[message.type];

  if (!requiredField) {
    throw new Error(`No handler is registered for ${message.type}`);
  }

  if (
    typeof message.payload[requiredField] !== "string" ||
    message.payload[requiredField].trim().length === 0
  ) {
    throw new Error(`${message.type} requires payload.${requiredField}`);
  }
}
