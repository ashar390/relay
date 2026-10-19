import { enqueueJob } from "../../lib/job-queue";
import { listJobs, removeJobById, saveJob } from "../../lib/job-repository";
import { validateJobSubmission } from "../../lib/job-submission";

export function GET() {
  const jobs = listJobs();

  return Response.json(
    {
      jobs,
      total: jobs.length,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const submission = validateJobSubmission(body);

  if (!submission.success) {
    return Response.json(
      {
        error: "Invalid job submission",
        issues: submission.issues,
      },
      { status: 400 },
    );
  }

  const job = saveJob(submission.data);

  try {
    await enqueueJob(job);
  } catch {
    removeJobById(job.id);

    return Response.json(
      { error: "Job could not be queued" },
      { status: 503 },
    );
  }

  return Response.json(job, {
    status: 201,
    headers: {
      Location: `/api/jobs/${job.id}`,
    },
  });
}
