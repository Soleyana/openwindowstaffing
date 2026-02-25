import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../api/auth";

export default function AccountSettings() {
  const { user, login } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user?.name, user?.email]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      setLoading(false);
      return;
    }
    if (newPassword && !currentPassword) {
      setError("Enter your current password to change it");
      setLoading(false);
      return;
    }

    try {
      const updates = {};
      if (name.trim() !== user?.name) updates.name = name.trim();
      if (email.trim().toLowerCase() !== user?.email?.toLowerCase()) updates.email = email.trim();
      if (newPassword) {
        updates.currentPassword = currentPassword;
        updates.newPassword = newPassword;
      }

      if (Object.keys(updates).length === 0) {
        setError("No changes to save");
        setLoading(false);
        return;
      }

      const data = await updateProfile(updates);
      login(data.user);
      setSuccess("Profile updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-settings">
      <h1 className="dashboard-title">Account Settings</h1>
      <p className="account-settings-subtitle">Update your name, email, or password.</p>

      <form onSubmit={handleSubmit} className="account-settings-form">
        {error && <p className="auth-error">{error}</p>}
        {success && <p className="auth-invite-notice">{success}</p>}

        <div className="auth-field-wrap">
          <label htmlFor="settings-name">Name</label>
          <input
            id="settings-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
        </div>

        <div className="auth-field-wrap">
          <label htmlFor="settings-email">Email</label>
          <input
            id="settings-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>

        <hr className="account-settings-divider" />

        <h2 className="account-settings-section">Change Password</h2>
        <p className="account-settings-hint">Leave blank to keep your current password.</p>

        <div className="auth-field-wrap">
          <label htmlFor="settings-current-password">Current password</label>
          <input
            id="settings-current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Required to change password"
            autoComplete="current-password"
          />
        </div>

        <div className="auth-field-wrap">
          <label htmlFor="settings-new-password">New password</label>
          <input
            id="settings-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            minLength={6}
            autoComplete="new-password"
          />
        </div>

        <div className="auth-field-wrap">
          <label htmlFor="settings-confirm-password">Confirm new password</label>
          <input
            id="settings-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>

        <div className="account-settings-actions">
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </button>
          <Link to="/dashboard" className="account-settings-back">Back to dashboard</Link>
        </div>
      </form>
    </div>
  );
}
