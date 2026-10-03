import type { Job } from "../lib/jobs";

type JobListProps = {
  jobs: Job[];
};

export function JobList({ jobs }: JobListProps) {
  return (
    <div className="job-table" role="table" aria-label="Sample background jobs">
      <div className="job-row job-header" role="row">
        <span role="columnheader">Job</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Created</span>
        <span role="columnheader">Attempts</span>
      </div>

      {jobs.map((job) => (
        <div className="job-row" role="row" key={job.id}>
          <div className="job-identity" role="cell">
            <strong>{job.name}</strong>
            <span>{job.id}</span>
          </div>
          <span className={`status-badge status-${job.status}`} role="cell">
            <span aria-hidden="true" />
            {job.status}
          </span>
          <span role="cell">{job.createdAt}</span>
          <span role="cell">{job.attempts}</span>
        </div>
      ))}
    </div>
  );
}
