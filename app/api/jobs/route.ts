import { sampleJobs, submitJob } from "../../lib/jobs";

export function GET() {
  return Response.json(
    {
      jobs: sampleJobs,
      total: sampleJobs.length,
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

  if (!isJobSubmission(body)) {
    return Response.json(
      { error: "Job name and type are required" },
      { status: 400 },
    );
  }

  const job = submitJob({
    name: body.name.trim(),
    type: body.type.trim(),
  });

  return Response.json(job, {
    status: 201,
    headers: {
      Location: `/api/jobs/${job.id}`,
    },
  });
}

function isJobSubmission(
  value: unknown,
): value is { name: string; type: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const submission = value as Record<string, unknown>;

  return (
    typeof submission.name === "string" &&
    submission.name.trim().length > 0 &&
    typeof submission.type === "string" &&
    submission.type.trim().length > 0
  );
}
