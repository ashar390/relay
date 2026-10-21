import assert from "node:assert/strict";
import test from "node:test";

const queuedMessages = [];

const defaultQueue = {
  async send(message) {
    queuedMessages.push(message);
  },
};

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  const { default: worker } = await import(workerUrl.href);

  return worker;
}

async function request(path = "/", init = {}, bindings = {}) {
  const worker = await loadWorker();

  return worker.fetch(
    new Request(`http://localhost${path}`, init),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      JOB_QUEUE: defaultQueue,
      ...bindings,
    },
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
    headers: { accept: "application/json" },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    id: "job_1042",
    name: "Import customer records",
    type: "customers.import",
    payload: { fileName: "customers-october.csv" },
    status: "running",
    createdAt: "Just now",
    attempts: 1,
  });
});

test("POST /api/jobs accepts a valid job submission", async () => {
  queuedMessages.length = 0;

  const response = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Generate monthly invoice",
      type: "invoice.generate",
      payload: {
        customerId: "cust_123",
        month: "2026-10",
      },
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
    payload: {
      customerId: "cust_123",
      month: "2026-10",
    },
    status: "queued",
    createdAt: body.createdAt,
    attempts: 0,
  });
  assert.equal(Number.isNaN(Date.parse(body.createdAt)), false);
  assert.deepEqual(queuedMessages, [
    {
      id: body.id,
      type: "invoice.generate",
      payload: {
        customerId: "cust_123",
        month: "2026-10",
      },
      createdAt: body.createdAt,
    },
  ]);

  const lookupResponse = await request(`/api/jobs/${body.id}`, {
    headers: { accept: "application/json" },
  });

  assert.equal(lookupResponse.status, 200);
  assert.deepEqual(await lookupResponse.json(), body);
});

test("POST /api/jobs explains invalid job submission fields", async () => {
  const response = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "",
      type: "Generate Invoice",
      payload: [],
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Invalid job submission",
    issues: [
      "name must contain 1 to 100 characters",
      "type must use dot-separated lowercase words, such as invoice.generate",
      "payload must be a JSON object",
    ],
  });
});

test("POST /api/jobs rejects malformed JSON", async () => {
  const response = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Request body must be valid JSON",
  });
});

test("POST /api/jobs rejects payloads larger than 16 KB", async () => {
  const response = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Import customer records",
      type: "customers.import",
      payload: { contents: "x".repeat(16 * 1024) },
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Invalid job submission",
    issues: ["payload must be 16 KB or smaller"],
  });
});

test("POST /api/jobs returns 503 when the queue is unavailable", async () => {
  const response = await request(
    "/api/jobs",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Generate monthly invoice",
        type: "invoice.generate",
        payload: { customerId: "cust_456" },
      }),
    },
    {
      JOB_QUEUE: {
        async send() {
          throw new Error("Queue unavailable");
        },
      },
    },
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: "Job could not be queued",
  });
});

test("queue consumer completes and acknowledges a supported job", async () => {
  queuedMessages.length = 0;

  const createResponse = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Import customer records",
      type: "customers.import",
      payload: { fileName: "customers-october.csv" },
    }),
  });
  const job = await createResponse.json();
  let acknowledged = false;
  let retried = false;
  const worker = await loadWorker();

  await worker.queue({
    messages: [
      {
        body: queuedMessages[0],
        ack() {
          acknowledged = true;
        },
        retry() {
          retried = true;
        },
      },
    ],
  });

  const lookupResponse = await request(`/api/jobs/${job.id}`);
  const completedJob = await lookupResponse.json();

  assert.equal(acknowledged, true);
  assert.equal(retried, false);
  assert.equal(completedJob.status, "completed");
  assert.equal(completedJob.attempts, 1);
});

test("queue consumer fails and retries an unsupported job", async () => {
  queuedMessages.length = 0;

  const createResponse = await request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Run unsupported task",
      type: "unknown.run",
      payload: {},
    }),
  });
  const job = await createResponse.json();
  let acknowledged = false;
  let retryOptions;
  const worker = await loadWorker();

  await worker.queue({
    messages: [
      {
        body: queuedMessages[0],
        ack() {
          acknowledged = true;
        },
        retry(options) {
          retryOptions = options;
        },
      },
    ],
  });

  const lookupResponse = await request(`/api/jobs/${job.id}`);
  const failedJob = await lookupResponse.json();

  assert.equal(acknowledged, false);
  assert.deepEqual(retryOptions, { delaySeconds: 30 });
  assert.equal(failedJob.status, "failed");
  assert.equal(failedJob.attempts, 1);
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
