import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { isOwner } from "../constants/roles";
import { useToast } from "../context/ToastContext";
import { getAllApplications, updateApplicationStatus } from "../api/applicationApi";
import { createInvite, listInvites } from "../api/invites";
import { API_BASE_URL } from "../config";
import StatusBadge from "../components/StatusBadge";

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const toast = useToast();

  const loadInvites = () => {
    if (!user || !isOwner(user)) return;
    listInvites()
      .then((res) => setInvites(res.data || []))
      .catch(() => setInvites([]));
  };

  const load = () => {
    if (!user) return;
    getAllApplications()
      .then((res) => setApplications(res.data || []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [user]);

  useEffect(() => {
    if (isOwner(user)) loadInvites();
  }, [user]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !isOwner(user)) return;
    setInviteLoading(true);
    setInviteSuccess(null);
    try {
      const res = await createInvite(inviteEmail.trim());
      setInviteSuccess(res.data);
      setInviteEmail("");
      loadInvites();
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || "Failed to create invite", "error");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleStatus = async (appId, status) => {
    try {
      await updateApplicationStatus(appId, status);
      setApplications((prev) =>
        prev.map((a) => (a._id === appId ? { ...a, status } : a))
      );
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || "Failed to update status", "error");
    }
  };

  if (loading) {
    return (
      <div className="recruiter-dashboard">
        <h1>Recruiter Dashboard</h1>
        <p>Loading applicants...</p>
      </div>
    );
  }

  return (
    <div className="recruiter-dashboard">
      <h1>Recruiter Dashboard</h1>
      <p>Welcome back!</p>

      {isOwner(user) && (
      <section className="recruiter-invite-section" style={{ marginBottom: "2rem", padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Invite Recruiter</h2>
        <p style={{ margin: "0 0 1rem", color: "#64748b", fontSize: "0.9rem" }}>Give someone access to post jobs. They'll receive a signup link—only people you invite can become recruiters.</p>
        <form onSubmit={handleInvite} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="email"
            placeholder="email@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{ padding: "0.5rem 0.75rem", fontSize: "1rem", border: "1px solid #e2e8f0", borderRadius: "6px", minWidth: "200px" }}
          />
          <button type="submit" disabled={inviteLoading} style={{ padding: "0.5rem 1rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>
            {inviteLoading ? "Creating…" : "Send Invite"}
          </button>
        </form>
        {inviteSuccess && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#ecfdf5", borderRadius: "6px", fontSize: "0.9rem" }}>
            <strong>Invite created!</strong> Share this link with {inviteSuccess.email}:
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <input readOnly value={inviteSuccess.inviteLink} style={{ flex: "1", minWidth: "200px", padding: "0.4rem 0.6rem", fontSize: "0.85rem", border: "1px solid #d1fae5", borderRadius: "4px", background: "#fff" }} />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(inviteSuccess.inviteLink); toast.show("Link copied to clipboard"); }}
                style={{ padding: "0.4rem 0.75rem", background: "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Copy
              </button>
            </div>
          </div>
        )}
        {invites.filter((i) => !i.used && new Date(i.expiresAt) > new Date()).length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <strong style={{ fontSize: "0.9rem" }}>Pending invites:</strong>
            <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem", fontSize: "0.9rem", color: "#64748b" }}>
              {invites.filter((i) => !i.used && new Date(i.expiresAt) > new Date()).map((i) => (
                <li key={i._id}>{i.email}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
      )}

      {applications.length === 0 ? (
        <p>No applications yet</p>
      ) : (
        <div className="recruiter-applications-table-wrap">
          <table className="recruiter-applications-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City/State</th>
                <th>Job Title</th>
                <th>Resume</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app._id}>
                  <td>
                    {[app.firstName, app.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>{app.email || "—"}</td>
                  <td>{app.phone || "—"}</td>
                  <td>
                    {[app.city, app.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td>{app.jobTitle || app.jobId?.title || "—"}</td>
                  <td>
                    {app.resumeUrl ? (
                      <a
                        href={`${API_BASE_URL}/uploads/${app.resumeUrl}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <StatusBadge status={app.status} variant="recruiter" />
                  </td>
                  <td>
                    {(!app.status || app.status === "applied" || app.status === "reviewing" || app.status === "pending" || app.status === "new") && (
                      <>
                        <button
                          type="button"
                          className="btn-accept"
                          onClick={() => handleStatus(app._id, "placed")}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="btn-reject"
                          onClick={() => handleStatus(app._id, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
