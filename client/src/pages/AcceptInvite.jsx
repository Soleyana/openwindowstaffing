import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { acceptInvite } from "../api/auth";
import { verifyInviteToken } from "../api/invites";
import { ROLES } from "../constants/roles";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login, isLoggedIn, user } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [valid, setValid] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      return;
    }
    verifyInviteToken(token)
      .then((data) => {
        setValid(!!data);
        if (data?.email) {
          setEmail(data.email);
        }
      })
      .catch(() => setValid(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const data = await acceptInvite(token, name, password);
      login(data.user);
      navigate(isStaff(data.user?.role) ? "/recruiter/dashboard" : "/dashboard");
    } catch (err) {
      setError(err.message || "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  };

  function isStaff(role) {
    return role === ROLES.RECRUITER || role === ROLES.OWNER;
  }

  if (valid === null) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p>Verifying invite...</p>
        </div>
      </div>
    );
  }

  if (valid === false) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Invalid Invite</h1>
          <p className="auth-error">This invite link is invalid, expired, or has already been used.</p>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Accept Invite</h1>
        <nav className="auth-breadcrumbs">
          <Link to="/">Home</Link>
          <span> / Accept Invite</span>
        </nav>
        <p className="auth-invite-notice">You&apos;ve been invited to join as staff. Complete your account below.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-field-wrap">
            <label htmlFor="invite-name">Full name</label>
            <input
              id="invite-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div className="auth-field-wrap">
            <label htmlFor="invite-email">Email</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              readOnly
              className="auth-input-readonly"
            />
          </div>
          <div className="auth-field-wrap">
            <label htmlFor="invite-password">Password</label>
            <input
              id="invite-password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="auth-field-wrap">
            <label htmlFor="invite-confirm">Confirm password</label>
            <input
              id="invite-confirm"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
