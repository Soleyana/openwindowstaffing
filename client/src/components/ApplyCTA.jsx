import { Link } from "react-router-dom";

export default function ApplyCTA() {
  return (
    <section className="apply-cta">
      <div className="apply-cta-grid">
        <div className="apply-cta-card">
          <span className="apply-cta-icon" aria-hidden="true">👤</span>
          <h3 className="apply-cta-title">Find Healthcare Jobs</h3>
          <p className="apply-cta-desc">
            Create an account and browse nursing, allied health, and therapy positions.
          </p>
          <Link to="/jobs" className="apply-cta-btn">
            Browse Jobs
            <span className="apply-cta-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="apply-cta-card">
          <span className="apply-cta-icon" aria-hidden="true">🏢</span>
          <h3 className="apply-cta-title">Contact Us</h3>
          <p className="apply-cta-desc">
            Questions about staffing? Reach out to our healthcare recruiting team.
          </p>
          <Link to="/contact" className="apply-cta-btn">
            Contact
            <span className="apply-cta-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
