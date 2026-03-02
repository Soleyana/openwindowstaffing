import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isOwner } from "../constants/roles";
import { useToast } from "../context/ToastContext";
import { createInvite, listInvites, revokeInvite } from "../api/invites";
import { getMyCompanies, createCompany } from "../api/companies";

export default function InviteRecruiter() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompanyId, setInviteCompanyId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);
  const toast = useToast();

  const loadCompanies = () => {
    if (!isOwner(user)) return;
    getMyCompanies()
      .then((res) => {
        const list = res.data || [];
        setCompanies(list);
        if (list.length > 0 && !inviteCompanyId) setInviteCompanyId(list[0]._id);
      })
      .catch(() => setCompanies([]));
  };

  useEffect(() => {
    if (isOwner(user)) {
      getMyCompanies()
        .then((res) => {
          const list = res.data || [];
          setCompanies(list);
          if (list.length > 0 && !inviteCompanyId) setInviteCompanyId(list[0]._id);
        })
        .catch(() => setCompanies([]));
    }
  }, [user]);

  const loadInvites = () => {
    if (!user || !isOwner(user)) return;
    listInvites()
      .then((res) => setInvites(res.data || []))
      .catch(() => setInvites([]));
  };

  useEffect(() => {
    if (isOwner(user)) loadInvites();
  }, [user]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !isOwner(user)) return;
    const companyId = inviteCompanyId || (companies.length === 1 ? companies[0]._id : "");
    if (!companyId) {
      toast.show("Select a company first. Create one under Companies if needed.", "error");
      return;
    }
    setInviteLoading(true);
    setInviteSuccess(null);
    try {
      const res = await createInvite(inviteEmail.trim(), companyId, "recruiter");
      setInviteSuccess(res.data);
      setInviteEmail("");
      loadInvites();
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || "Failed to create invite", "error");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!inviteId) return;
    try {
      setRevokingId(inviteId);
      await revokeInvite(inviteId);
      loadInvites();
      setInviteSuccess(null);
      toast.show("Invite revoked");
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || "Failed to revoke invite", "error");
    } finally {
      setRevokingId(null);
    }
  };

  if (!user) return null;
  if (!isOwner(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="invite-recruiter-page" style={{ maxWidth: "600px" }}>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem" }}>Invite Recruiter</h1>
      <p style={{ margin: "0 0 1.5rem", color: "#64748b", fontSize: "0.95rem" }}>
        Give someone access to post jobs. They&apos;ll receive a signup link—only people you invite can become recruiters.
      </p>

      {companies.length === 0 && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#fef3c7", borderRadius: "8px", color: "#92400e" }}>
          <p style={{ margin: "0 0 0.75rem" }}>Create a company first to invite recruiters.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCompanyName.trim()) return;
              setCreatingCompany(true);
              try {
                await createCompany({ name: newCompanyName.trim() });
                toast.show("Company created");
                setNewCompanyName("");
                loadCompanies();
              } catch (err) {
                toast.show(err.response?.data?.message || "Failed to create company", "error");
              } finally {
                setCreatingCompany(false);
              }
            }}
            style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
          >
            <input
              type="text"
              placeholder="Company name"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              style={{ padding: "0.5rem 0.75rem", fontSize: "1rem", border: "1px solid #e2e8f0", borderRadius: "6px", minWidth: "200px" }}
            />
            <button type="submit" disabled={creatingCompany || !newCompanyName.trim()} style={{ padding: "0.5rem 1rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>
              {creatingCompany ? "Creating…" : "Create Company"}
            </button>
          </form>
        </div>
      )}
      <form onSubmit={handleInvite} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.5rem" }}>
        {companies.length > 0 && (
          <select
            value={inviteCompanyId}
            onChange={(e) => setInviteCompanyId(e.target.value)}
            required
            style={{ padding: "0.5rem 0.75rem", fontSize: "1rem", border: "1px solid #e2e8f0", borderRadius: "6px", minWidth: "180px" }}
          >
            <option value="">Select company</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        )}
        <input
          type="email"
          placeholder="email@example.com"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          style={{ padding: "0.5rem 0.75rem", fontSize: "1rem", border: "1px solid #e2e8f0", borderRadius: "6px", minWidth: "200px" }}
        />
        <button type="submit" disabled={inviteLoading || companies.length === 0} style={{ padding: "0.5rem 1rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>
          {inviteLoading ? "Creating…" : "Send Invite"}
        </button>
      </form>

      {inviteSuccess && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#ecfdf5", borderRadius: "8px", fontSize: "0.9rem", border: "1px solid #d1fae5" }}>
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
        <div>
          <strong style={{ fontSize: "0.9rem" }}>Pending invites:</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: 0, fontSize: "0.9rem", color: "#64748b", listStyle: "none" }}>
            {invites.filter((i) => !i.used && new Date(i.expiresAt) > new Date()).map((i) => (
              <li key={i._id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span>{i.email}</span>
                <button
                  type="button"
                  onClick={() => handleRevokeInvite(i._id)}
                  disabled={revokingId === i._id}
                  style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "4px", cursor: "pointer" }}
                >
                  {revokingId === i._id ? "…" : "Revoke"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
