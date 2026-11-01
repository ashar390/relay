import type { Job } from "../lib/jobs";

type JobListProps = {
  jobs: Job[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function JobList({ jobs, selectedId, onSelect }: JobListProps) {
  return (
    <div className="job-table" role="table" aria-label="Background jobs">
      <div className="job-row job-header" role="row">
        <span role="columnheader">Job</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Created</span>
        <span role="columnheader">Attempts</span>
      </div>

      {jobs.map((job) => (
        <div
          className={`job-row${selectedId === job.id ? " job-row-selected" : ""}`}
          role="row"
          key={job.id}
        >
          <div className="job-identity" role="cell">
            {onSelect ? (
              <button type="button" onClick={() => onSelect(job.id)}>
                {job.name}
              </button>
            ) : (
              <strong>{job.name}</strong>
            )}
            <span>{job.id}</span>
          </div>
          <span className={`status-badge status-${job.status}`} role="cell">
            <span aria-hidden="true" />
            {job.status}
          </span>
          <span role="cell">{job.createdAt}</span>
          <span role="cell">{job.attempts}</span>
          {job.failure ? (
            <div className="failure-summary" role="cell">
              <span className="failure-code">{job.failure.code}</span>
              <span>{job.failure.message}</span>
              <span className="failure-policy">
                {job.failure.retryable
                  ? "Retry scheduled"
                  : "Manual review required"}
              </span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
