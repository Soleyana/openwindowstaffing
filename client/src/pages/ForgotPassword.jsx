import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email?.trim()) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Check Your Email</h1>
          <nav className="auth-breadcrumbs">
            <Link to="/">Home</Link>
            <span> / Forgot Password</span>
          </nav>
          <p className="auth-invite-notice">
            If an account exists for that email, we&apos;ve sent a password reset link.
            Check your inbox and follow the link to set a new password.
          </p>
          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password</h1>
        <nav className="auth-breadcrumbs">
          <Link to="/">Home</Link>
          <span> / Forgot Password</span>
        </nav>
        <p className="auth-invite-notice">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-field-wrap">
            <label htmlFor="forgot-email">Email</label>
            <input
              id="forgot-email"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
          <p className="auth-switch">
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
