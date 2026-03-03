import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyAssignments, acceptAssignment } from "../api/assignments";
import { useToast } from "../context/ToastContext";
import { ROLES } from "../constants/roles";

const STATUS_LABELS = {
  drafted: "Draft",
  offered: "Offer Pending",
  accepted: "Accepted",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function MyAssignments() {
  const { isLoggedIn, user } = useAuth();
  const [searchParams] = useSearchParams();
  const offerId = searchParams.get("offer");
  const { show: showToast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || user?.role !== ROLES.APPLICANT) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await getMyAssignments();
        if (!cancelled) setAssignments(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isLoggedIn, user?.role]);

  const handleAccept = async (assignId) => {
    if (!assignId || acceptingId) return;
    setAcceptingId(assignId);
    try {
      await acceptAssignment(assignId);
      showToast("Offer accepted", "success");
      const res = await getMyAssignments();
      setAssignments(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to accept", "error");
    } finally {
      setAcceptingId(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="jobs-page">
        <p>Please <Link to="/login">sign in</Link> as a candidate to view your assignments.</p>
      </div>
    );
  }

  if (user?.role !== ROLES.APPLICANT) {
    return (
      <div className="jobs-page">
        <p>This page is for job seekers.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header" style={{ marginBottom: "1.5rem" }}>
        <h1>My Assignments</h1>
      </div>
      {loading && <p className="jobs-loading">Loading…</p>}
      {error && <p className="jobs-error">{error}</p>}
      {!loading && !error && assignments.length === 0 && (
        <p className="text-muted">You have no assignments yet. Apply to jobs to get started.</p>
      )}
      {!loading && !error && assignments.length > 0 && (
        <div className="card">
          <ul style={{ listStyle: "none", padding: 0 }}>
            {assignments.map((a) => {
              const isOffered = a.status === "offered";
              const highlightOffer = offerId === a._id;
              return (
                <li
                  key={a._id}
                  style={{
                    padding: "1rem 0",
                    borderBottom: "1px solid #eee",
                    ...(highlightOffer ? { background: "#f0fdf4", margin: "0 -1rem", padding: "1rem" } : {}),
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <strong>{a.jobId?.title || "Assignment"}</strong>
                    <span className="badge" style={{ textTransform: "capitalize" }}>
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                    {a.companyId?.name && (
                      <span className="text-muted">{a.companyId.name}</span>
                    )}
                  </div>
                  {a.jobId?.location && (
                    <p className="text-muted" style={{ margin: "0.25rem 0 0", fontSize: "0.9rem" }}>{a.jobId.location}</p>
                  )}
                  {a.payRate?.payRate != null && (
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
                      ${a.payRate.payRate}/{a.payRate.unit || "hr"}
                    </p>
                  )}
                  {a.startDate && (
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                      Start: {new Date(a.startDate).toLocaleDateString()}
                      {a.endDate && ` — End: ${new Date(a.endDate).toLocaleDateString()}`}
                    </p>
                  )}
                  {isOffered && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ marginTop: "0.75rem" }}
                      disabled={acceptingId === a._id}
                      onClick={() => handleAccept(a._id)}
                    >
                      {acceptingId === a._id ? "Accepting…" : "Accept Offer"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
