import { Link } from "react-router-dom";

const steps = [
  "Register now and complete your profile. Be as detailed as possible.",
  "Log in to search jobs, view pay packages and review facility information.",
  "Click \"I'm Interested\" to let your recruiter know.",
];

export default function HowItWorks() {
  return (
    <section className="how-it-works">
      <div className="how-it-works-inner">
        <div className="how-it-works-left">
          <h2 className="how-it-works-title">How it Works</h2>
          <p className="how-it-works-desc">
            Open Window Staffing connects healthcare professionals with top facilities nationwide. Whether you&apos;re a nurse, therapist, or allied health professional, we make it simple to find your next opportunity.
          </p>
          <ol className="how-it-works-steps">
            {steps.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ol>
        </div>
        <div className="how-it-works-right">
          <div className="how-it-works-video">
            <div className="how-it-works-video-inner">
              <span className="how-it-works-play" aria-hidden="true">▶</span>
            </div>
          </div>
          <Link to="/jobs" className="how-it-works-btn">See the Difference</Link>
        </div>
      </div>
    </section>
  );
}
