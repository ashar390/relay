import type { JobQueueMessage } from "./job-queue";
import { JobHandlerError, runJobHandler } from "./job-handlers";
import { getJobRepository } from "./repository-provider";

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
  const jobRepository = getJobRepository();
  for (const message of batch.messages) {
    try {
      await processJob(message.body, jobRepository);
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

async function processJob(
  message: JobQueueMessage,
  jobRepository: ReturnType<typeof getJobRepository>,
): Promise<void> {
  const job = await jobRepository.updateStatus(message.id, "running");

  if (!job) {
    throw new JobProcessingError(
      "JOB_NOT_FOUND",
      `Job ${message.id} was not found`,
      true,
    );
  }

  await jobRepository.updateProgress(message.id, 50, "Handler processing payload");
  const result = await runJobHandler(message);
  await jobRepository.complete(message.id, result);
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
  if (error instanceof JobProcessingError || error instanceof JobHandlerError) {
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
