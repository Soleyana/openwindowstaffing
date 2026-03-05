import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { PASSWORD_RULES } from "../config";

export default function ResetPassword() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(search || "").get("token");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (success) navigate("/login", { replace: true });
  }, [success, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token || !token.trim()) {
      setError("Invalid reset link. Request a new one from the forgot password page.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError(PASSWORD_RULES);
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Password Reset</h1>
          <p className="auth-invite-notice">Your password has been reset. Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  if (!token || !token.trim()) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Invalid Link</h1>
          <p className="auth-error">{error || "Invalid reset link. Request a new one from the forgot password page."}</p>
          <p className="auth-switch">
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Reset Password</h1>
        <nav className="auth-breadcrumbs">
          <Link to="/">Home</Link>
          <span> / Reset Password</span>
        </nav>
        <p className="auth-invite-notice">{PASSWORD_RULES}</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-field-wrap">
            <label htmlFor="reset-new">New password</label>
            <input
              id="reset-new"
              type="password"
              placeholder={PASSWORD_RULES}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="auth-field-wrap">
            <label htmlFor="reset-confirm">Confirm new password</label>
            <input
              id="reset-confirm"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Resetting…" : "Reset Password"}
          </button>
          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
