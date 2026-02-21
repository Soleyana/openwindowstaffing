import { Link } from "react-router-dom";

export default function AudienceSplit() {
  return (
    <section className="audience-section">
      <div className="audience-grid">
        <div className="audience-card audience-card--employers">
          <h2 className="audience-title">Healthcare Employers</h2>
          <p className="audience-subtitle">Post nursing and allied health positions. Find qualified clinicians.</p>
          <Link to="/post-job" className="audience-button">
            POST A JOB
          </Link>
        </div>
        <div className="audience-card audience-card--candidates">
          <h2 className="audience-title">Healthcare Professionals</h2>
          <p className="audience-subtitle">Find nursing, therapy, and allied health jobs nationwide.</p>
          <Link to="/jobs" className="audience-button">
            BROWSE JOBS
          </Link>
        </div>
      </div>
    </section>
  );
}
