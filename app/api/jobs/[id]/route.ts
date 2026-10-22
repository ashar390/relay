import { jobRepository } from "../../../lib/job-repository";

type JobRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: JobRouteContext) {
  const { id } = await params;
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

  return Response.json(job, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
