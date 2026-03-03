import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getOnboardingChecklist, markOnboardingStepComplete } from "../api/onboarding";
import { isOwner } from "../constants/roles";

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getOnboardingChecklist()
      .then((res) => { if (!cancelled) setData(res?.data ?? res); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleMarkComplete(step) {
    if (marking) return;
    setMarking(step);
    try {
      await markOnboardingStepComplete(step);
      const res = await getOnboardingChecklist();
      setData(res?.data ?? res);
    } finally {
      setMarking(null);
    }
  }

  if (!user) return null;

  const isEmployer = isOwner(user);
  const title = "Onboarding";

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="skeleton-block" style={{ height: 300 }} />
      </div>
    );
  }

  if (data?.allDone || data?.type === "none") {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const steps = data?.steps ?? [];

  return (
    <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1 className="dashboard-title">{title}</h1>
          <p className="dashboard-subtitle">
            {isEmployer ? "Complete these steps to get your agency up and running." : "Complete these steps to get the most out of your job search."}
          </p>
        </div>

        <div className="card">
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {steps.map((step) => (
              <li
                key={step.key}
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 600,
                    backgroundColor: step.done ? "#16a34a" : "#e2e8f0",
                    color: step.done ? "#fff" : "#64748b",
                  }}
                >
                  {step.done ? "✓" : steps.indexOf(step) + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <strong>{step.label}</strong>
                  {step.done ? (
                    <span className="text-muted" style={{ marginLeft: "0.5rem" }}>Done</span>
                  ) : (
                    <>
                      <Link to={step.link} className="btn-primary" style={{ marginLeft: "0.75rem", padding: "0.35rem 0.75rem", fontSize: "0.9rem" }}>
                        {step.key === "reviewPipeline" || step.key === "checkInbox" ? "Go" : "Start"}
                      </Link>
                      {(step.key === "reviewPipeline" || step.key === "checkInbox") && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ marginLeft: "0.5rem", padding: "0.35rem 0.75rem", fontSize: "0.9rem" }}
                          disabled={marking === step.key}
                          onClick={() => handleMarkComplete(step.key)}
                        >
                          {marking === step.key ? "..." : "Mark done"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div style={{ padding: "1rem", borderTop: "1px solid #e2e8f0", marginTop: "0.5rem" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/dashboard")}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
  );
}
