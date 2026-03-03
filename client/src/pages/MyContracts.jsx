import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyContracts, downloadContract } from "../api/contracts";
import { useToast } from "../context/ToastContext";

const STATUS_LABELS = {
  draft: "Draft",
  sent: "Awaiting Signature",
  signed: "Signed",
};

export default function MyContracts() {
  const { show: showToast } = useToast();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMyContracts()
      .then((d) => { if (!cancelled) setContracts(d?.data ?? d ?? []); })
      .catch(() => { if (!cancelled) setContracts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleDownload(id) {
    if (downloadingId) return;
    setDownloadingId(id);
    try {
      await downloadContract(id);
      showToast("Download started", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Download failed", "error");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1 className="dashboard-title">My Contracts</h1>
        <p className="dashboard-subtitle">View and sign your placement contracts</p>
      </div>

      {loading ? (
        <div className="skeleton-block" style={{ height: 200 }} />
      ) : contracts.length === 0 ? (
        <div className="dashboard-hero" style={{ textAlign: "center", color: "#64748b" }}>
          No contracts yet. When a recruiter sends you a contract, it will appear here.
        </div>
      ) : (
        <div className="card">
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {contracts.map((c) => (
              <li
                key={c._id}
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
                    <strong>{c.offerId?.jobId?.title || "Placement"}</strong>
                    {c.companyId?.name && (
                      <span className="text-muted" style={{ marginLeft: "0.5rem" }}>— {c.companyId.name}</span>
                    )}
                  </div>
                  <span
                    className={`badge ${c.status === "signed" ? "badge-compliance-cleared" : c.status === "sent" ? "badge-compliance-expiring" : ""}`}
                    style={{ textTransform: "capitalize" }}
                  >
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </div>
                {c.status === "sent" && (
                  <Link to={`/contract/${c._id}/sign`} className="btn-primary" style={{ display: "inline-block", width: "fit-content" }}>
                    Sign Contract
                  </Link>
                )}
                {c.status === "signed" && (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="text-muted">
                      Signed {c.signedAt ? new Date(c.signedAt).toLocaleDateString() : ""}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "0.25rem 0.75rem", fontSize: "0.9rem" }}
                      disabled={downloadingId === c._id}
                      onClick={() => handleDownload(c._id)}
                    >
                      {downloadingId === c._id ? "Downloading…" : "Download"}
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
