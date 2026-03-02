import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerUser } from "../api/auth";
import { PASSWORD_RULES } from "../config";
import { getRedirectTarget } from "../lib/authRedirect";
import AuthLoadingSpinner from "../components/AuthLoadingSpinner";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authLoading, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      const target = getRedirectTarget(user, location.state?.from);
      navigate(target, { replace: true });
    }
  }, [authLoading, user, navigate, location.state?.from]);

  if (authLoading || user) return <AuthLoadingSpinner />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError(PASSWORD_RULES);
      return;
    }
    setLoading(true);
    try {
      const data = await registerUser(name, email, password);
      login(data.user);
      const target = getRedirectTarget(data.user, location.state?.from);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">SIGN UP</h1>
        <nav className="auth-breadcrumbs">
          <Link to="/">Home</Link>
          <span> / Sign Up</span>
        </nav>
        <p className="auth-invite-notice" style={{ marginBottom: "1rem" }}>
          Create an account to apply for healthcare jobs.
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-field-wrap">
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div className="auth-field-wrap">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field-wrap">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              placeholder={PASSWORD_RULES}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span className="auth-hint">{PASSWORD_RULES}</span>
          </div>
          <div className="auth-field-wrap">
            <label htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Creating account…" : "CREATE ACCOUNT"}
          </button>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
