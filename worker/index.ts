/** Cloudflare Worker entry point for Relay. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { runWithRuntimeBindings } from "../app/lib/runtime-bindings";
import { consumeJobBatch, type JobMessageBatch } from "../app/lib/job-consumer";

interface Env extends Cloudflare.Env {
  HYPERDRIVE?: { connectionString: string };
  RELAY_API_KEY?: string;
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return runWithRuntimeBindings(
      {
        JOB_QUEUE: env.JOB_QUEUE,
        HYPERDRIVE: env.HYPERDRIVE,
        RELAY_API_KEY: env.RELAY_API_KEY,
      },
      () => handler.fetch(request, env, ctx),
    );
  },

  async queue(batch: JobMessageBatch, env?: Env): Promise<void> {
    await runWithRuntimeBindings(
      {
        JOB_QUEUE: env?.JOB_QUEUE as Cloudflare.Env["JOB_QUEUE"],
        HYPERDRIVE: env?.HYPERDRIVE,
        RELAY_API_KEY: env?.RELAY_API_KEY,
      },
      () => consumeJobBatch(batch),
    );
  },
};

export default worker;
