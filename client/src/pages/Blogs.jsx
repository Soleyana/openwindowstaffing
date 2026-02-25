import { Link } from "react-router-dom";

const tips = [
  {
    title: "Resume Tips for Healthcare Professionals",
    content: "Tailor your resume to each job posting. Highlight relevant certifications, licenses, and clinical experience. Use action verbs and quantify achievements where possible—e.g., 'Managed care for 8 patients per shift.' Keep it to 1–2 pages and proofread carefully.",
  },
  {
    title: "Preparing for Healthcare Interviews",
    content: "Research the facility and role before your interview. Prepare examples of patient care, teamwork, and how you handle difficult situations. Have questions ready about the team, schedule, and growth opportunities. Dress professionally and arrive early.",
  },
  {
    title: "Negotiating Your Healthcare Salary",
    content: "Know your worth by researching market rates for your role and location. Consider total compensation—base pay, benefits, shift differentials, and PTO. Be confident but flexible. It's okay to ask for time to consider an offer.",
  },
  {
    title: "Building Your Professional Network",
    content: "Connect with recruiters, peers, and managers on LinkedIn. Attend conferences and local healthcare events. Stay in touch with colleagues from past positions. A strong network can lead to referrals and new opportunities.",
  },
  {
    title: "Transitioning to Travel Nursing",
    content: "Research agencies and compare pay packages, housing, and benefits. Ensure your license is valid in the state where you'll work. Plan for 13-week assignments and be flexible with locations. Build an emergency fund before your first assignment.",
  },
  {
    title: "Work-Life Balance in Healthcare",
    content: "Set boundaries between work and home. Use PTO—don't let it expire. Find stress-relief strategies that work for you. Consider different schedules (part-time, per diem, or flexible hours) if needed. Your wellbeing matters.",
  },
];

export default function Blogs() {
  return (
    <div className="content-page">
      <h1 className="content-page-title">What we&apos;re thinking</h1>
      <nav className="content-page-breadcrumbs">
        <Link to="/">Home</Link>
        <span> / Blogs & Tips</span>
      </nav>
      <p className="content-page-intro">
        Latest insights on healthcare staffing, career tips for clinicians, and industry updates from our team.
      </p>
      <div className="content-page-body">
        <section className="content-section">
          <h2>Career Tips for Clinicians</h2>
          <div className="blogs-tips-list">
            {tips.map((tip, i) => (
              <article key={i} className="blogs-tip-card">
                <h3>{tip.title}</h3>
                <p>{tip.content}</p>
              </article>
            ))}
          </div>
        </section>
        <div className="content-page-cta">
          <Link to="/jobs" className="content-cta-btn">Browse Healthcare Jobs</Link>
          <Link to="/contact" className="content-cta-btn content-cta-btn--outline">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
