import { useState, useEffect } from "react";
import { getMyOffers, acceptOffer, declineOffer } from "../api/offers";
import { useToast } from "../context/ToastContext";

const STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export default function MyOffers() {
  const { show: showToast } = useToast();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMyOffers()
      .then((res) => { if (!cancelled) setOffers(res.data || []); })
      .catch(() => { if (!cancelled) setOffers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleAccept(id) {
    if (actingId) return;
    setActingId(id);
    try {
      await acceptOffer(id);
      showToast("Offer accepted. You are now placed.", "success");
      setOffers((prev) => prev.map((o) => (o._id === id ? { ...o, status: "accepted" } : o)));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to accept", "error");
    } finally {
      setActingId(null);
    }
  }

  async function handleDecline(id) {
    if (actingId) return;
    setActingId(id);
    try {
      await declineOffer(id);
      showToast("Offer declined", "success");
      setOffers((prev) => prev.map((o) => (o._id === id ? { ...o, status: "declined" } : o)));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to decline", "error");
    } finally {
      setActingId(null);
    }
  }

  const actionableOffers = offers.filter((o) => o.status === "sent");
  const otherOffers = offers.filter((o) => o.status !== "sent");

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1 className="dashboard-title">My Offers</h1>
        <p className="dashboard-subtitle">
          {actionableOffers.length > 0
            ? `You have ${actionableOffers.length} offer(s) to respond to`
            : "View and manage your job offers"}
        </p>
      </div>

      {loading ? (
        <div className="skeleton-block" style={{ height: 200 }} />
      ) : offers.length === 0 ? (
        <div className="dashboard-hero" style={{ textAlign: "center", color: "#64748b" }}>
          No offers yet. When a recruiter sends you an offer, it will appear here.
        </div>
      ) : (
        <div className="card">
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {offers.map((o) => (
              <li
                key={o._id}
                style={{
                  padding: "1.25rem",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <strong>{o.jobId?.title || "Job"}</strong>
                    {o.companyId?.name && (
                      <span className="text-muted" style={{ marginLeft: "0.5rem" }}>— {o.companyId.name}</span>
                    )}
                  </div>
                  <span
                    className={`badge ${o.status === "accepted" ? "badge-compliance-cleared" : o.status === "sent" ? "badge-compliance-expiring" : ""}`}
                    style={{ textTransform: "capitalize" }}
                  >
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>
                {o.payRate != null && (
                  <div className="text-muted" style={{ fontSize: "0.95rem" }}>
                    Pay: ${o.payRate}/hr
                  </div>
                )}
                {o.startDate && (
                  <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                    Start: {new Date(o.startDate).toLocaleDateString()}
                  </div>
                )}
                {o.scheduleNotes && (
                  <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                    {o.scheduleNotes}
                  </div>
                )}
                {o.status === "accepted" && (
                  <div style={{ marginTop: "0.5rem", color: "#16a34a", fontWeight: 500 }}>
                    ✓ Placed — Assignment active
                  </div>
                )}
                {o.status === "sent" && (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={actingId === o._id}
                      onClick={() => handleAccept(o._id)}
                    >
                      {actingId === o._id ? "Accepting…" : "Accept Offer"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={actingId === o._id}
                      onClick={() => handleDecline(o._id)}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
