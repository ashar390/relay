import { getJobRepository } from "../../lib/repository-provider";
import { getOptionalRuntimeBindings } from "../../lib/runtime-bindings";

export async function GET() {
  const bindings = getOptionalRuntimeBindings();
  const storage = bindings?.HYPERDRIVE ? "postgresql" : "memory";

  try {
    await getJobRepository().list();

    return Response.json(
      {
        status: "ready",
        storage,
        queue: bindings?.JOB_QUEUE ? "configured" : "unavailable",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        status: "degraded",
        storage,
        queue: bindings?.JOB_QUEUE ? "configured" : "unavailable",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
