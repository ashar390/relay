import { requireApiKey } from "../../../../lib/api-auth";
import { enqueueJob } from "../../../../lib/job-queue";
import { getJobRepository } from "../../../../lib/repository-provider";

type RetryJobRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RetryJobRouteContext) {
  const unauthorized = requireApiKey(request);

  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await params;
  const jobRepository = getJobRepository();
  const job = await jobRepository.findById(id);

  if (!job) {
    return Response.json(
      {
        error: "Job not found",
        jobId: id,
      },
      { status: 404 },
    );
  }

  if (job.status !== "failed" || !job.failure) {
    return Response.json(
      {
        error: "Only failed jobs can be retried",
        jobId: id,
        status: job.status,
      },
      { status: 409 },
    );
  }

  const previousFailure = job.failure;
  const queuedJob = await jobRepository.updateStatus(id, "queued");

  if (!queuedJob) {
    return Response.json(
      { error: "Job could not be prepared for retry" },
      { status: 500 },
    );
  }

  try {
    await enqueueJob(queuedJob);
  } catch {
    await jobRepository.markFailed(id, previousFailure);

    return Response.json(
      { error: "Job could not be queued for retry" },
      { status: 503 },
    );
  }

  return Response.json(queuedJob, {
    status: 202,
    headers: {
      Location: `/api/jobs/${id}`,
    },
  });
}
