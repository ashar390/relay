import { JobList } from "./components/job-list";
import { sampleJobs } from "./lib/jobs";

const stages = [
  { number: "01", title: "Submit", copy: "A website sends Relay a slow task." },
  { number: "02", title: "Queue", copy: "Relay keeps the task safe while it waits." },
  { number: "03", title: "Process", copy: "An available worker completes the task." },
  { number: "04", title: "Understand", copy: "Relay reports the result or explains the failure." },
];

export default function Home() {
  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Relay home">
          <span className="brand-mark">R</span>
          <span>Relay</span>
        </a>
        <span className="nav-note">Job infrastructure</span>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow"><span /> Failure-aware job processing</div>
        <h1>Background work,<br /><em>made understandable.</em></h1>
        <p className="intro">
          Relay helps websites run slow tasks away from the main request, then
          shows developers what happened when a task succeeds or fails.
        </p>
        <div className="status-row" aria-label="Relay principles">
          <div><strong>Reliable</strong><span>Keep important work from disappearing.</span></div>
          <div><strong>Observable</strong><span>See each step of a job&apos;s journey.</span></div>
          <div><strong>Recoverable</strong><span>Repair failed work and safely try again.</span></div>
        </div>
      </section>

      <section className="flow" aria-labelledby="flow-title">
        <div className="section-heading">
          <span>How it will work</span>
          <h2 id="flow-title">One job, four simple steps.</h2>
        </div>
        <div className="stage-grid">
          {stages.map((stage) => (
            <article className="stage" key={stage.number}>
              <span className="stage-number">{stage.number}</span>
              <h3>{stage.title}</h3>
              <p>{stage.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard" aria-labelledby="dashboard-title">
        <div className="dashboard-heading">
          <div>
            <p className="label">Operations preview</p>
            <h2 id="dashboard-title">Know what every job is doing.</h2>
          </div>
          <p className="dashboard-note">
            Sample data for the first dashboard iteration. Live queue data comes next.
          </p>
        </div>
        <JobList jobs={sampleJobs} />
      </section>

      <section className="promise" aria-labelledby="promise-title">
        <p className="label">What makes Relay different</p>
        <h2 id="promise-title">Most tools tell you a job failed.</h2>
        <p className="accent-copy">Relay will help you understand why—and safely try again.</p>
        <div className="product-note">
          <span className="dot" />
          <p><strong>Built for the difficult moments:</strong> timeouts, invalid data, crashed workers, and jobs that need a careful second attempt.</p>
        </div>
      </section>

      <footer>
        <span>Relay</span>
        <span>Background work, made understandable.</span>
      </footer>
    </main>
  );
}
