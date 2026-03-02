import { Component } from "react";
import { Link } from "react-router-dom";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const label = this.props.fallbackLabel || "Page";
      const requestId = this.state.error?.response?.data?.requestId;
      return (
        <div
          className="inbox-page"
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "Poppins, sans-serif",
            background: "#fff",
            color: "var(--text, #1f2937)",
          }}
        >
          <h1 style={{ marginBottom: "1rem", fontSize: "1.5rem" }}>Something went wrong</h1>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            {label} could not load. Please try refreshing or go back home.
          </p>
          {requestId && (
            <p style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "#94a3b8" }}>
              Request ID: {requestId}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#0077b6",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            <Link
              to="/"
              style={{
                padding: "0.75rem 1.5rem",
                background: "#e2e8f0",
                color: "#334155",
                textDecoration: "none",
                borderRadius: "10px",
                fontWeight: 600,
              }}
            >
              Go to Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
