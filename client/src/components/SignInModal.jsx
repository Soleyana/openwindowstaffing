import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../constants/roles";
import { loginUser } from "../api/auth";

export default function SignInModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      login(data.user);
      onClose();
      navigate(isStaff(data.user?.role) ? "/recruiter/dashboard" : "/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="signin-modal-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close sign in"
      />
      <div className="signin-modal" role="dialog" aria-label="Sign in">
        <div className="signin-modal-header">
          <h2 className="signin-modal-title">SIGN IN</h2>
          <button
            type="button"
            className="signin-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <form className="signin-modal-body" onSubmit={handleSubmit}>
          {error && <p className="signin-modal-error">{error}</p>}
          <div className="signin-field-wrap">
            <label htmlFor="signin-email">Email</label>
            <input
              id="signin-email"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              aria-label="Email"
            />
          </div>
          <div className="signin-field-wrap">
            <label htmlFor="signin-password">Password</label>
            <input
              id="signin-password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              aria-label="Password"
            />
          </div>
          <label className="signin-check-wrap">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              aria-label="Keep me signed in"
            />
            <span>Keep me signed in</span>
          </label>
          <button type="submit" className="signin-submit-btn" disabled={loading}>
            {loading ? "Signing in…" : "SIGN IN"}
          </button>
          <div className="signin-links">
            <Link to="/signup" className="signin-link" onClick={onClose}>
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
