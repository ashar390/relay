import { sampleJobs } from "../../lib/jobs";

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
