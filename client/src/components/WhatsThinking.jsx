import { Link } from "react-router-dom";

export default function WhatsThinking() {
  return (
    <section className="whats-thinking">
      <div className="whats-thinking-inner">
        <div className="whats-thinking-left">
          <h2 className="whats-thinking-title">What we&apos;re thinking</h2>
          <p className="whats-thinking-desc">
            Latest insights on healthcare staffing, career tips for clinicians, and industry updates from our team.
          </p>
          <Link to="/jobs" className="whats-thinking-btn">View All Blogs</Link>
        </div>
        <div className="whats-thinking-right">
          <div className="whats-thinking-img-wrap">
            <img src="/images/pexels-rdne-6129243.jpg" alt="Healthcare team" onError={(e) => { e.target.style.display = "none"; }} />
          </div>
        </div>
      </div>
    </section>
  );
}
