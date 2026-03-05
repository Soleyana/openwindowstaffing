import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { loginUser } from "../api/auth";
import { preloadCsrfToken } from "../api/axios";
import { getJobs } from "../api/jobs";
import { getRedirectTarget } from "../lib/authRedirect";
import AuthLoadingSpinner from "../components/AuthLoadingSpinner";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authLoading, login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverReachable, setServerReachable] = useState(null);

  useEffect(() => {
    const msg = window.sessionStorage.getItem("auth_expired_message");
    if (msg) {
      window.sessionStorage.removeItem("auth_expired_message");
      toast.show(msg, "error");
    }
  }, [toast]);

  useEffect(() => {
    preloadCsrfToken();
    getJobs()
      .then(() => setServerReachable(true))
      .catch(() => setServerReachable(false));
  }, []);

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
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      login(data.user);
      const target = getRedirectTarget(data.user, location.state?.from);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">SIGN IN</h1>
        <nav className="auth-breadcrumbs">
          <Link to="/">Home</Link>
          <span> / Sign In</span>
        </nav>
        <form onSubmit={handleSubmit} className="auth-form">
          {serverReachable === false && (
            <p className="auth-error" role="alert">
              Cannot reach server. Start the backend with <code>npm run dev</code> in the server folder, then run <code>npm run dev</code> in the client folder.
            </p>
          )}
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-field-wrap">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field-wrap">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <label className="auth-check-wrap">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
            />
            <span>Keep me signed in</span>
          </label>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Signing in…" : "SIGN IN"}
          </button>
          <p className="auth-switch">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          <p className="auth-switch">
            Don&apos;t have an account?{" "}
            <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
