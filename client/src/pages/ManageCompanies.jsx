import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCompanies, createCompany, updateCompany } from "../api/companies";
import { useToast } from "../context/ToastContext";
import { isOwner } from "../constants/roles";

export default function ManageCompanies() {
  const { user } = useAuth();
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", legalName: "", billingEmail: "", phone: "", website: "" });
  const [saving, setSaving] = useState(false);

  const canCreate = isOwner(user?.role);

  const load = () => {
    getCompanies()
      .then((res) => {
        const list = res?.data ?? [];
        setCompanies(Array.isArray(list) ? list : []);
      })
      .catch((err) => toast.show(err?.response?.data?.message || "Failed to load companies", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = (c = null) => {
    setEditing(c?._id || null);
    setForm({
      name: c?.name ?? "",
      legalName: c?.legalName ?? "",
      billingEmail: c?.billingEmail ?? "",
      phone: c?.phone ?? "",
      website: c?.website ?? "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.show("Company name is required", "error");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCompany(editing, form);
        toast.show("Company updated", "success");
      } else if (canCreate) {
        await createCompany(form);
        toast.show("Company created", "success");
      }
      resetForm(null);
      load();
    } catch (err) {
      toast.show(err?.response?.data?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div style={{ marginBottom: "1.5rem" }}>
        <Link to="/dashboard" style={{ color: "var(--primary)", fontSize: "0.9rem" }}>← Dashboard</Link>
      </div>
      <h1 className="dashboard-title">Manage Companies</h1>
      <p className="dashboard-subtitle" style={{ margin: "0.25rem 0 1.5rem" }}>
        Create and edit companies for your agency.
      </p>

      {loading && <p className="dashboard-placeholder">Loading…</p>}

      {canCreate && (
        <div style={{ marginBottom: "1.5rem", padding: "1.25rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>{editing ? "Edit Company" : "Add Company"}</h2>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 400 }}>
            <label>
              <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>Company name *</span>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
            </label>
            <label>
              <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>Legal name</span>
              <input type="text" value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
            </label>
            <label>
              <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>Billing email</span>
              <input type="email" value={form.billingEmail} onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))} style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
            </label>
            <label>
              <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>Phone</span>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
            </label>
            <label>
              <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>Website</span>
              <input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "6px" }} />
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit" disabled={saving} className="dashboard-cta">{saving ? "Saving…" : editing ? "Update" : "Create"}</button>
              {editing && <button type="button" onClick={() => resetForm(null)} className="dashboard-cta--outline">Cancel</button>}
            </div>
          </form>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {companies.map((c) => (
          <div key={c._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: "1.05rem" }}>{c.name}</span>
              {c.legalName && <span style={{ display: "block", color: "#64748b", fontSize: "0.9rem" }}>{c.legalName}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Link to={"/dashboard/facilities?companyId=" + c._id} style={{ color: "var(--primary)", fontSize: "0.9rem" }}>Facilities</Link>
              {canCreate && <button type="button" onClick={() => resetForm(c)} className="dashboard-cta--outline" style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}>Edit</button>}
            </div>
          </div>
        ))}
      </div>

      {!loading && companies.length === 0 && (
        <p className="dashboard-placeholder">No companies yet. {canCreate ? "Create one above." : "Contact your admin."}</p>
      )}
    </div>
  );
}
