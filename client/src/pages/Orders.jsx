import { Link } from "react-router-dom";
import { BRAND } from "../config";

export default function Orders() {
  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">Orders & Billing</h1>
      <p className="dashboard-subtitle" style={{ margin: "0.25rem 0 1.5rem", color: "#64748b" }}>
        Manage your subscription and billing
      </p>

      <div style={{ padding: "2rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", maxWidth: "500px" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Current Plan</h2>
        <p style={{ margin: "0 0 1rem", color: "#64748b" }}>
          You have access to post jobs and manage applicants. For custom plans, volume pricing, or enterprise features, contact us.
        </p>
        <div style={{ marginTop: "1.5rem" }}>
          <a
            href={`mailto:${BRAND.contactEmail}?subject=Billing%20or%20Plan%20Inquiry`}
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              background: "var(--primary)",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "8px",
              fontWeight: 600,
            }}
          >
            Contact for Billing
          </a>
        </div>
      </div>
    </div>
  );
}
