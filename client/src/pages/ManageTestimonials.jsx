import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import CompanySwitcher from "../components/CompanySwitcher";
import { useCompany } from "../context/CompanyContext";
import { getAdminTestimonials, approveTestimonial, rejectTestimonial, hideTestimonial } from "../api/testimonials";

const TABS = ["pending", "approved", "rejected", "hidden"];

export default function ManageTestimonials() {
  const toast = useToast();
  const { companies, selectedCompanyId } = useCompany();
  const companyId = selectedCompanyId;
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    if (!companyId) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    getAdminTestimonials({ companyId, status: tab })
      .then((res) => {
        const data = res?.data ?? {};
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      })
      .catch((err) => {
        toast.show(err?.response?.data?.message || "Failed to load", "error");
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [companyId, tab]);

  const handleApprove = async (id) => {
    try {
      await approveTestimonial(id);
      toast.show("Review approved", "success");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.message || "Failed to approve", "error");
    }
  };

  const handleReject = async (id) => {
    setRejecting(id);
    try {
      await rejectTestimonial(id, rejectReason);
      toast.show("Review rejected", "success");
      setRejectReason("");
      setRejecting(null);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.message || "Failed to reject", "error");
      setRejecting(null);
    }
  };

  const handleHide = async (id) => {
    try {
      await hideTestimonial(id);
      toast.show("Review hidden", "success");
      load();
    } catch (err) {
      toast.show(err?.response?.data?.message || "Failed to hide", "error");
    }
  };

  const openRejectModal = (id) => {
    setRejecting(id);
  };
  const closeRejectModal = () => {
    setRejecting(null);
    setRejectReason("");
  };

  return (
    <div className="dashboard-page">
      <div style={{ marginBottom: "1.5rem" }}>
        <Link to="/dashboard" style={{ color: "var(--primary)", fontSize: "0.9rem" }}>← Dashboard</Link>
      </div>
      <h1 className="dashboard-title">Manage Reviews</h1>
      <p className="dashboard-subtitle" style={{ margin: "0.25rem 0 1rem" }}>
        Moderate testimonials for your company.
      </p>

      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>Company</label>
        <CompanySwitcher />
      </div>

      {!companyId && companies.length > 0 && (
        <p className="dashboard-placeholder">Select a company above.</p>
      )}

      {companyId && (
        <>
          <div className="reviews-admin-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={tab === t ? "dashboard-cta" : "dashboard-cta--outline"} style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {loading && <p className="dashboard-placeholder">Loading…</p>}
          {!loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {rows.map((r) => (
                <div key={r._id} className="reviews-admin-card" style={{ padding: "1rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span style={{ fontWeight: 600 }}>{r.authorName}</span>
                        {r.authorRole && <span style={{ color: "#64748b", fontSize: "0.9rem" }}>— {r.authorRole}</span>}
                      </div>
                      {r.rating && (
                        <div className="reviews-admin-stars" style={{ marginBottom: "0.5rem" }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className={s <= r.rating ? "testimonial-star--filled" : ""} style={{ color: s <= r.rating ? "#eab308" : "#e2e8f0" }}>★</span>
                          ))}
                        </div>
                      )}
                      <p style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>{r.message?.slice(0, 200)}{r.message?.length > 200 ? "…" : ""}</p>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                      {r.status === "pending" && (
                        <>
                          <button type="button" onClick={() => handleApprove(r._id)} className="dashboard-cta" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}>Approve</button>
                          <button type="button" onClick={() => openRejectModal(r._id)} className="dashboard-cta--outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}>Reject</button>
                        </>
                      )}
                      {(r.status === "approved" || r.status === "rejected") && (
                        <button type="button" onClick={() => handleHide(r._id)} className="dashboard-cta--outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}>Hide</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && rows.length === 0 && (
            <p className="dashboard-placeholder">No {tab} reviews.</p>
          )}
        </>
      )}

      {rejecting && (
        <div className="reviews-reject-modal" onClick={closeRejectModal}>
          <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "12px", maxWidth: 400, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 1rem" }}>Reject review</h3>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>
              <span>Reason (optional)</span>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }} placeholder="Internal note..." />
            </label>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button type="button" onClick={() => handleReject(rejecting)} className="dashboard-cta">Reject</button>
              <button type="button" onClick={closeRejectModal} className="dashboard-cta--outline">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
