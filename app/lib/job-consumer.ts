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
    } catch (error) {
      const failure = describeFailure(error);
      await jobRepository.markFailed(message.body.id, {
        ...failure,
        occurredAt: new Date().toISOString(),
      });

      if (failure.retryable) {
        message.retry({ delaySeconds: RETRY_DELAY_SECONDS });
      } else {
        message.ack();
      }
    }
  }
}

async function processJob(message: JobQueueMessage): Promise<void> {
  const job = await jobRepository.updateStatus(message.id, "running");

  if (!job) {
    throw new JobProcessingError(
      "JOB_NOT_FOUND",
      `Job ${message.id} was not found`,
      true,
    );
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
    throw new JobProcessingError(
      "UNSUPPORTED_JOB_TYPE",
      `No handler is registered for ${message.type}`,
      false,
    );
  }

  if (
    typeof message.payload[requiredField] !== "string" ||
    message.payload[requiredField].trim().length === 0
  ) {
    throw new JobProcessingError(
      "INVALID_JOB_PAYLOAD",
      `${message.type} requires payload.${requiredField}`,
      false,
    );
  }
}

class JobProcessingError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "JobProcessingError";
  }
}

function describeFailure(error: unknown): {
  code: string;
  message: string;
  retryable: boolean;
} {
  if (error instanceof JobProcessingError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }

  return {
    code: "JOB_PROCESSING_ERROR",
    message: "The job could not be processed",
    retryable: true,
  };
}
