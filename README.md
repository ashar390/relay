# Relay

Relay is a failure-aware background job platform. Applications submit slow work to an HTTP API, Relay stores and queues it, a worker processes it, and the dashboard explains the outcome.

Live application: [relay.anusha-sharma.workers.dev](https://relay.anusha-sharma.workers.dev)

## What Relay can do

- Submit and validate background jobs through an HTTP API
- Process jobs asynchronously with Cloudflare Queues
- Track queued, running, completed, and failed states
- Record progress, attempts, structured failures, results, and execution history
- Retry temporary failures automatically
- Manually replay failed jobs through the API or dashboard
- Filter jobs by status and type with live dashboard updates
- Persist jobs in PostgreSQL through Cloudflare Hyperdrive
- Protect job submission and replay with a Bearer API key
- Route exhausted retries to a dead-letter queue

## Demonstration handlers

Relay includes deterministic handlers for:

- `csv.validate`
- `customers.import`
- `report.generate`
- `email.send`
- `invoice.generate`

The handlers validate their payloads and produce inspectable results. External delivery services can be connected behind the same handler interface without changing the queue or dashboard.

## Technology

- TypeScript
- React and Next.js
- Cloudflare Workers and Queues
- PostgreSQL
- Cloudflare Hyperdrive
- Node.js test runner

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Without a database binding, Relay uses an in-memory repository so the complete interface can be explored locally.

Run verification:

```bash
npm test
npm run lint
npx tsc --noEmit
```

## API

### Submit a job

```http
POST /api/jobs
Authorization: Bearer YOUR_RELAY_API_KEY
Content-Type: application/json

{
  "name": "Generate monthly invoice",
  "type": "invoice.generate",
  "payload": {
    "customerId": "cust_123",
    "month": "2026-11"
  }
}
```

### List and inspect jobs

```http
GET /api/jobs
GET /api/jobs/:id
```

Service readiness is available at `GET /api/health`.

### Replay a failed job

```http
POST /api/jobs/:id/retry
Authorization: Bearer YOUR_RELAY_API_KEY
```

Set `RELAY_API_KEY` to enable authentication. When it is not configured, mutation routes remain open for local demonstration.

## PostgreSQL setup

Create an empty PostgreSQL database, then run all migrations:

```bash
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require" npm run db:migrate
```

The migration runner records applied files in `relay_migrations`, so running it again is safe.

Create a Hyperdrive configuration from the same connection string:

```bash
npx wrangler hyperdrive create relay-database \
  --connection-string="postgres://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

Add the returned ID to `wrangler.jsonc`:

```json
"hyperdrive": [
  {
    "binding": "HYPERDRIVE",
    "id": "YOUR_HYPERDRIVE_ID"
  }
]
```

Do not commit database credentials. For local Hyperdrive development, provide `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` in your shell.

## Cloudflare setup and deployment

Create the primary and dead-letter queues once:

```bash
npx wrangler queues create relay-jobs
npx wrangler queues create relay-jobs-dead-letter
```

Store the production API key as an encrypted secret:

```bash
npx wrangler secret put RELAY_API_KEY
```

Deploy:

```bash
npx wrangler deploy
```

The committed configuration contains queue names but no credentials, database URLs, API keys, or account-specific resource IDs.

## Project structure

- `app/api` — job submission, lookup, listing, and replay endpoints
- `app/components` — live operations dashboard
- `app/lib` — repositories, queue integration, handlers, validation, and authentication
- `worker` — HTTP and queue entry points
- `database/migrations` — versioned PostgreSQL schema
- `scripts` — repeatable operational commands
- `tests` — end-to-end request and queue behavior
