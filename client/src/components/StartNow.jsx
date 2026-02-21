import { Link } from "react-router-dom";

const steps = [
  { icon: "person", title: "Register", desc: "Create a free account as a healthcare professional or employer." },
  { icon: "search", title: "Search", desc: "Browse nursing, allied health, and therapy jobs nationwide." },
  { icon: "apply", title: "Apply", desc: "Apply to positions with one click. Add a cover message to stand out." },
  { icon: "star", title: "Succeed", desc: "Connect with facilities and advance your healthcare career." },
];

export default function StartNow() {
  return (
    <section className="start-now">
      <div className="start-now-inner">
        <div className="start-now-left">
          <h2 className="start-now-title">Start Your Healthcare Career</h2>
          <p className="start-now-subtitle">Register, search jobs, apply, and connect with top healthcare facilities.</p>
          <Link to="/signup" className="start-now-btn">GET STARTED</Link>
        </div>
        <div className="start-now-cards">
          {steps.map((s, i) => (
            <div key={i} className="start-now-card">
              <span className={`start-now-icon start-now-icon--${s.icon}`} aria-hidden="true">
                {s.icon === "person" && "👤"}
                {s.icon === "search" && "🔍"}
                {s.icon === "apply" && "✈"}
                {s.icon === "star" && "★"}
              </span>
              <h3 className="start-now-card-title">{s.title}</h3>
              <p className="start-now-card-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
