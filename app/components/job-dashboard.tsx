"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job, JobStatus } from "../lib/jobs";
import { JobList } from "./job-list";

type JobDashboardProps = {
  initialJobs: Job[];
};

type StatusFilter = "all" | JobStatus;

export function JobDashboard({ initialJobs }: JobDashboardProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(initialJobs[0]?.id ?? null);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("Live updates every 5 seconds");

  useEffect(() => {
    async function refreshJobs() {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        const response = await fetch("/api/jobs", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Jobs could not be refreshed");
        }

        const body = (await response.json()) as { jobs: Job[] };
        setJobs(body.jobs);
        setMessage("Live updates every 5 seconds");
      } catch {
        setMessage("Live updates are temporarily unavailable");
      }
    }

    const interval = window.setInterval(refreshJobs, 5_000);
    return () => window.clearInterval(interval);
  }, []);

  const jobTypes = useMemo(
    () => [...new Set(jobs.map((job) => job.type))].sort(),
    [jobs],
  );
  const filteredJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          (statusFilter === "all" || job.status === statusFilter) &&
          (typeFilter === "all" || job.type === typeFilter),
      ),
    [jobs, statusFilter, typeFilter],
  );
  const selectedJob = jobs.find((job) => job.id === selectedId) ?? null;

  function rememberApiKey(value: string) {
    setApiKey(value);
  }

  async function retryJob(job: Job) {
    setMessage(`Retrying ${job.name}…`);

    const response = await fetch(`/api/jobs/${job.id}/retry`, {
      method: "POST",
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setMessage(body.error ?? "The job could not be retried");
      return;
    }

    const retriedJob = (await response.json()) as Job;
    setJobs((current) =>
      current.map((item) => (item.id === retriedJob.id ? retriedJob : item)),
    );
    setMessage(`${retriedJob.name} is queued again`);
  }

  return (
    <div className="job-dashboard">
      <div className="dashboard-controls" aria-label="Job filters">
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label>
          Type
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All types</option>
            {jobTypes.map((type) => (
              <option value={type} key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="api-key-field">
          API key for retry controls
          <input
            type="password"
            value={apiKey}
            onChange={(event) => rememberApiKey(event.target.value)}
            placeholder="Only required when security is enabled"
            autoComplete="off"
          />
        </label>
        <span className="live-note" aria-live="polite">{message}</span>
      </div>

      <JobList
        jobs={filteredJobs}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {filteredJobs.length === 0 ? (
        <p className="empty-jobs">No jobs match these filters.</p>
      ) : null}

      {selectedJob ? (
        <section className="job-details" aria-labelledby="job-details-title">
          <div className="details-heading">
            <div>
              <span className="label">Selected job</span>
              <h3 id="job-details-title">{selectedJob.name}</h3>
            </div>
            {selectedJob.status === "failed" || selectedJob.status === "queued" ? (
              <button type="button" onClick={() => retryJob(selectedJob)}>
                {selectedJob.status === "queued" ? "Requeue job" : "Retry job"}
              </button>
            ) : null}
          </div>

          <div className="progress-heading">
            <span>Progress</span>
            <strong>{selectedJob.progress}%</strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={selectedJob.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${selectedJob.progress}%` }} />
          </div>

          <div className="details-grid">
            <div>
              <span className="label">Execution history</span>
              <ol className="history-list">
                {selectedJob.history.map((event, index) => (
                  <li key={`${event.at}-${index}`}>
                    <strong>{event.status}</strong>
                    <span>{event.message}</span>
                    <time>{event.at}</time>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <span className="label">Result</span>
              <pre>{selectedJob.result ? JSON.stringify(selectedJob.result, null, 2) : "No result yet"}</pre>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
