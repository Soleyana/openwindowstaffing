import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useCompany } from "../context/CompanyContext";
import {
  getInvoices,
  getInvoice,
  generateInvoice,
  issueInvoice,
  markPaidInvoice,
  downloadInvoiceCsv,
} from "../api/invoices";
import { useToast } from "../context/ToastContext";
import { isStaff } from "../constants/roles";

const STATUS_LABELS = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  void: "Void",
};

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function Invoices() {
  const { user } = useAuth();
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [generateModal, setGenerateModal] = useState(false);
  const [genForm, setGenForm] = useState({ from: "", to: "" });
  const [submitting, setSubmitting] = useState(false);
  const [markPaidModal, setMarkPaidModal] = useState(null);

  useEffect(() => {
    if (!user || !isStaff(user.role)) {
      setLoading(false);
      return;
    }
    if (companies?.length === 1 && !selectedCompanyId) {
      setSelectedCompanyId?.(companies[0]._id);
    }
  }, [user, companies, selectedCompanyId]);

  useEffect(() => {
    if (!user || !isStaff(user.role)) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const params = { ...filters };
        if (selectedCompanyId) params.companyId = selectedCompanyId;
        const res = await getInvoices(params);
        if (!cancelled) setInvoices(res.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, selectedCompanyId, filters.status, filters.from, filters.to]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getInvoice(detailId)
      .then((res) => { if (!cancelled) setDetail(res.data); })
      .catch(() => { if (!cancelled) setDetail(null); });
    return () => { cancelled = true; };
  }, [detailId]);

  const handleGenerate = async () => {
    const cid = selectedCompanyId || companies?.[0]?._id;
    if (!cid || !genForm.from || !genForm.to || submitting) return;
    try {
      setSubmitting(true);
      await generateInvoice({ companyId: cid, from: genForm.from, to: genForm.to });
      toast.show("Invoice generated", "success");
      setGenerateModal(false);
      setGenForm({ from: "", to: "" });
      const params = { ...filters };
      if (selectedCompanyId) params.companyId = selectedCompanyId;
      const res = await getInvoices(params);
      setInvoices(res.data || []);
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to generate", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = async (id) => {
    setSubmitting(true);
    try {
      await issueInvoice(id);
      toast.show("Invoice issued", "success");
      if (detailId === id) getInvoice(id).then((r) => setDetail(r.data));
      const params = { ...filters };
      if (selectedCompanyId) params.companyId = selectedCompanyId;
      const res = await getInvoices(params);
      setInvoices(res.data || []);
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to issue", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id) => {
    if (!markPaidModal || markPaidModal !== id) return;
    setSubmitting(true);
    try {
      await markPaidInvoice(id);
      toast.show("Invoice marked paid", "success");
      setMarkPaidModal(null);
      if (detailId === id) getInvoice(id).then((r) => setDetail(r.data));
      const params = { ...filters };
      if (selectedCompanyId) params.companyId = selectedCompanyId;
      const res = await getInvoices(params);
      setInvoices(res.data || []);
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to mark paid", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (id, format = "csv") => {
    try {
      await downloadInvoiceExport(id, format);
      toast.show(`Invoice exported (${format === "html" ? "HTML - print to PDF" : "CSV"})`, "success");
    } catch (err) {
      toast.show(err.message || "Failed to export", "error");
    }
  };

  if (!user || !isStaff(user.role)) {
    return (
      <div className="dashboard-page">
        <p>This page is for recruiters and company owners.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <h1>Invoices</h1>
        <button type="button" className="btn-primary" onClick={() => setGenerateModal(true)}>
          Generate Invoice
        </button>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {companies?.length > 1 && (
          <label>
            Company
            <select
              value={selectedCompanyId || ""}
              onChange={(e) => setSelectedCompanyId?.(e.target.value || null)}
              style={{ marginLeft: "0.5rem" }}
            >
              <option value="">All</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          Status
          <select
            value={filters.status || ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
            style={{ marginLeft: "0.5rem" }}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="paid">Paid</option>
          </select>
        </label>
      </div>
      {loading && <p className="jobs-loading">Loading…</p>}
      {error && <p className="jobs-error">{error}</p>}
      {!loading && !error && (
        <div className="card">
          {invoices.length === 0 ? (
            <p className="text-muted">No invoices. Generate from approved timesheets.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.5rem" }}>Number</th>
                    <th style={{ textAlign: "left", padding: "0.5rem" }}>Period</th>
                    <th style={{ textAlign: "right", padding: "0.5rem" }}>Total</th>
                    <th style={{ textAlign: "left", padding: "0.5rem" }}>Status</th>
                    <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td style={{ padding: "0.5rem" }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: "0.5rem" }}>
                        {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                      </td>
                      <td style={{ padding: "0.5rem", textAlign: "right" }}>
                        ${(inv.total ?? 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <span className="badge" style={{ textTransform: "capitalize" }}>
                          {STATUS_LABELS[inv.status] || inv.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem" }}>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                            onClick={() => setDetailId(inv._id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                            onClick={() => handleExport(inv._id, "csv")}
                          >
                            Export CSV
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                            onClick={() => handleExport(inv._id, "html")}
                          >
                            Export PDF
                          </button>
                          {inv.status === "draft" && (
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                              disabled={submitting}
                              onClick={() => handleIssue(inv._id)}
                            >
                              Issue
                            </button>
                          )}
                          {inv.status === "issued" && (
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
                              disabled={submitting}
                              onClick={() => setMarkPaidModal(inv._id)}
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {generateModal && (
        <div className="modal-overlay" onClick={() => setGenerateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "24rem" }}>
            <div className="modal-header">
              <h2>Generate Invoice</h2>
              <button type="button" className="modal-close" onClick={() => setGenerateModal(false)} aria-label="Close">&times;</button>
            </div>
            <div className="modal-body">
              <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                Creates a draft invoice from approved timesheets in the date range.
              </p>
              {companies?.length > 1 && (
                <p style={{ marginBottom: "0.5rem" }}>Company: {companies.find((c) => c._id === selectedCompanyId)?.name || "All"}</p>
              )}
              <label>
                From
                <input
                  type="date"
                  value={genForm.from}
                  onChange={(e) => setGenForm((f) => ({ ...f, from: e.target.value }))}
                  required
                  style={{ marginLeft: "0.5rem" }}
                />
              </label>
              <label style={{ display: "block", marginTop: "0.5rem" }}>
                To
                <input
                  type="date"
                  value={genForm.to}
                  onChange={(e) => setGenForm((f) => ({ ...f, to: e.target.value }))}
                  required
                  style={{ marginLeft: "0.5rem" }}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setGenerateModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                disabled={!genForm.from || !genForm.to || submitting}
                onClick={handleGenerate}
              >
                {submitting ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {markPaidModal && (
        <div className="modal-overlay" onClick={() => setMarkPaidModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "24rem" }}>
            <div className="modal-header">
              <h2>Mark Invoice Paid</h2>
              <button type="button" className="modal-close" onClick={() => setMarkPaidModal(null)} aria-label="Close">&times;</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to mark this invoice as paid?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setMarkPaidModal(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                disabled={submitting}
                onClick={() => handleMarkPaid(markPaidModal)}
              >
                {submitting ? "Marking…" : "Mark Paid"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="modal-overlay" onClick={() => setDetailId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "32rem", maxHeight: "90vh", overflow: "auto" }}>
            <div className="modal-header">
              <h2>Invoice {detail.invoiceNumber}</h2>
              <button type="button" className="modal-close" onClick={() => setDetailId(null)} aria-label="Close">&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: "0 0 0.5rem" }}>
                <strong>{detail.companyId?.name || ""}</strong>
              </p>
              <p className="text-muted" style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
                {formatDate(detail.periodStart)} – {formatDate(detail.periodEnd)} • {STATUS_LABELS[detail.status] || detail.status}
              </p>
              <div className="invoice-status-timeline" style={{ fontSize: "0.85rem", marginBottom: "1rem", padding: "0.5rem", background: "#f8fafc", borderRadius: 6 }}>
                <span>Draft</span>
                <span>→ Issued {detail.issuedAt ? formatDate(detail.issuedAt) : "—"}</span>
                <span>→ Paid {detail.paidAt ? formatDate(detail.paidAt) : "—"}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.25rem" }}>Description</th>
                    <th style={{ textAlign: "right", padding: "0.25rem" }}>Hours</th>
                    <th style={{ textAlign: "right", padding: "0.25rem" }}>Rate</th>
                    <th style={{ textAlign: "right", padding: "0.25rem" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.lineItems || []).map((li, i) => (
                    <tr key={i}>
                      <td style={{ padding: "0.25rem" }}>{li.description}</td>
                      <td style={{ padding: "0.25rem", textAlign: "right" }}>{(li.hours ?? 0).toFixed(1)}</td>
                      <td style={{ padding: "0.25rem", textAlign: "right" }}>${(li.rate ?? 0).toFixed(2)}</td>
                      <td style={{ padding: "0.25rem", textAlign: "right" }}>${(li.amount ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ textAlign: "right", margin: "0" }}>
                <strong>Total: ${(detail.total ?? 0).toFixed(2)}</strong>
              </p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button type="button" className="btn-secondary" onClick={() => handleExport(detail._id, "csv")}>
                  Export CSV
                </button>
                <button type="button" className="btn-secondary" onClick={() => handleExport(detail._id, "html")}>
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
