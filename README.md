# Relay

Relay is a failure-aware background job processing platform designed to make asynchronous work easier to monitor, understand, and recover.

Web applications can submit long-running tasks to Relay instead of making users wait for those tasks to finish. Relay will queue the work, assign it to available workers, track execution, retry temporary failures, and preserve failed jobs for inspection.

## Planned capabilities

- Background job submission and processing
- Concurrent workers
- Job status and progress tracking
- Automatic retries with failure-aware policies
- Failed-job inspection
- Repair and replay workflow
- Worker health monitoring and crash recovery
- Real-time operations dashboard

## Initial demonstration

Relay will demonstrate a multi-step customer import workflow:

1. Validate an uploaded CSV file
2. Import valid customer records
3. Generate an import report
4. Send a completion notification

## Status

Relay is currently in its initial development stage. The application includes the product overview and the first operations dashboard, which uses sample job data to establish the job model and status interface. Live job processing is not implemented yet.

## Technology direction

- TypeScript
- React
- Node.js
- Redis
- PostgreSQL
- Docker
