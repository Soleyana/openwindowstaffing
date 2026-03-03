import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyCompanies } from "../api/companies";
import { requestInvoice } from "../api/invoices";
import { BRAND } from "../config";
import { useToast } from "../context/ToastContext";

export default function Orders() {
  const { user } = useAuth();
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMyCompanies()
      .then((res) => {
        const list = res?.data || res || [];
        setCompanies(list);
        if (list.length === 1 && !companyId) setCompanyId(list[0]._id);
      })
      .catch(() => setCompanies([]));
  }, [user]);

  const handleRequestInvoice = async (e) => {
    e.preventDefault();
    const cid = companyId || companies[0]?._id;
    if (!cid || submitting) return;
    try {
      setSubmitting(true);
      await requestInvoice({ companyId: cid, message: message.trim() || undefined });
      toast.show("Invoice request submitted. We'll be in touch shortly.", "success");
      setMessage("");
    } catch (err) {
      toast.show(err.response?.data?.message || "Failed to submit request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-page orders-page">
      <h1 className="dashboard-title">Orders & Billing</h1>
      <p className="dashboard-subtitle" style={{ margin: "0.25rem 0 1rem", color: "#64748b" }}>
        Manage your subscription and billing
      </p>

      <div className="orders-plan-card">
        <h2 className="orders-plan-title">Current Plan</h2>
        <p className="orders-plan-desc">
          You have access to post jobs and manage applicants. For custom plans, volume pricing, or enterprise features, contact us.
        </p>
        <a
          href={`mailto:${BRAND.contactEmail}?subject=Billing%20or%20Plan%20Inquiry`}
          className="orders-contact-link"
        >
          Contact for Billing
        </a>
      </div>

      <p style={{ marginBottom: "1rem" }}>
        <Link to="/invoices">View Invoices</Link> — Generate invoices from approved timesheets.
      </p>
      <div className="orders-invoice-section">
        <h2 className="orders-section-title">Request Invoice</h2>
        <p className="orders-section-desc">Submit a request to receive an invoice for your company.</p>
        <form onSubmit={handleRequestInvoice} className="orders-invoice-form">
          {companies.length > 1 ? (
            <label>
              <span>Company</span>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </label>
          ) : companies.length === 1 ? (
            <p className="orders-company-single">Company: {companies[0].name}</p>
          ) : companies.length === 0 ? (
            <p className="orders-no-company">No company linked. Contact support to set up billing.</p>
          ) : null}
          <label>
            <span>Message (optional)</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any notes for the billing team…"
              rows={3}
              aria-label="Optional message for billing team"
            />
          </label>
          <button type="submit" disabled={submitting || !(companyId || companies[0]?._id)} className="orders-submit-btn">
            {submitting ? "Submitting…" : "Request Invoice"}
          </button>
        </form>
      </div>
    </div>
  );
}
