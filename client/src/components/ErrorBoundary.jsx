import { Component } from "react";
import { Link } from "react-router-dom";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "Poppins, sans-serif",
          background: "#f8fafc",
          color: "#1e3a5f",
        }}>
          <h1 style={{ marginBottom: "1rem", fontSize: "1.5rem" }}>Something went wrong</h1>
          <p style={{ marginBottom: "1.5rem", color: "#64748b" }}>Please try refreshing or go back home.</p>
          <Link
            to="/"
            style={{
              padding: "0.75rem 1.5rem",
              background: "#0077b6",
              color: "white",
              textDecoration: "none",
              borderRadius: "10px",
              fontWeight: 600,
            }}
          >
            Go to Home
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
