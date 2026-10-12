import assert from "node:assert/strict";
import test from "node:test";

async function request(path = "/", init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders Relay's product overview and sample job dashboard", async () => {
  const response = await request("/", { headers: { accept: "text/html" } });
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
  const response = await request("/api/jobs", {
    headers: { accept: "application/json" },
  });

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
    type: "customers.import",
    status: "running",
    createdAt: "Just now",
    attempts: 1,
  });
});

test("POST /api/jobs accepts a valid job submission", async () => {
  const response = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Generate monthly invoice",
      type: "invoice.generate",
    }),
  });

  assert.equal(response.status, 201);

  const body = await response.json();
  assert.match(body.id, /^job_[0-9a-f-]{36}$/);
  assert.equal(response.headers.get("location"), `/api/jobs/${body.id}`);
  assert.deepEqual(body, {
    id: body.id,
    name: "Generate monthly invoice",
    type: "invoice.generate",
    status: "queued",
    createdAt: body.createdAt,
    attempts: 0,
  });
  assert.equal(Number.isNaN(Date.parse(body.createdAt)), false);

  const lookupResponse = await request(`/api/jobs/${body.id}`, {
    headers: { accept: "application/json" },
  });

  assert.equal(lookupResponse.status, 200);
  assert.deepEqual(await lookupResponse.json(), body);
});

test("POST /api/jobs rejects an invalid job submission", async () => {
  const response = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Generate monthly invoice" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Job name and type are required",
  });
});

test("GET /api/jobs/:id returns 404 for an unknown job", async () => {
  const response = await request("/api/jobs/job_missing", {
    headers: { accept: "application/json" },
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: "Job not found",
    jobId: "job_missing",
  });
});
