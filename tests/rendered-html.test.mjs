import assert from "node:assert/strict";
import test from "node:test";

async function request(path = "/", headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders Relay's product overview and sample job dashboard", async () => {
  const response = await request("/", { accept: "text/html" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Relay — Background work, made understandable<\/title>/i);
  assert.match(html, /Background work/);
  assert.match(html, /One job, four simple steps/);
  assert.match(html, /Know what every job is doing/);
  assert.match(html, /Import customer records/);
  assert.match(html, /Generate import report/);
  assert.match(html, />running</i);
  assert.match(html, />queued</i);
  assert.match(html, />completed</i);
  assert.match(html, />failed</i);
  assert.match(html, /Most tools tell you a job failed/);
  assert.doesNotMatch(html, /Week 1|Day 1|learning in public/i);
});

test("GET /api/jobs returns the sample jobs as JSON", async () => {
  const response = await request("/api/jobs", { accept: "application/json" });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const body = await response.json();
  assert.equal(body.total, 4);
  assert.equal(body.jobs.length, body.total);
  assert.deepEqual(
    body.jobs.map(({ id, status }) => ({ id, status })),
    [
      { id: "job_1042", status: "running" },
      { id: "job_1041", status: "queued" },
      { id: "job_1040", status: "completed" },
      { id: "job_1039", status: "failed" },
    ],
  );
});

test("GET /api/jobs/:id returns one job", async () => {
  const response = await request("/api/jobs/job_1042", {
    accept: "application/json",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    id: "job_1042",
    name: "Import customer records",
    status: "running",
    createdAt: "Just now",
    attempts: 1,
  });
});

test("GET /api/jobs/:id returns 404 for an unknown job", async () => {
  const response = await request("/api/jobs/job_missing", {
    accept: "application/json",
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: "Job not found",
    jobId: "job_missing",
  });
});
