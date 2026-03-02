import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getFacilities, createFacility, updateFacility } from "../api/facilities";
import { useToast } from "../context/ToastContext";
import CompanySwitcher from "../components/CompanySwitcher";
import { useCompany } from "../context/CompanyContext";
import { useAuth } from "../context/AuthContext";
import { isOwner } from "../constants/roles";

export default function ManageFacilities() {
  const { user } = useAuth();
  const { companies, loading: companiesLoading, selectedCompanyId, setSelectedCompanyId } = useCompany();
  const [searchParams] = useSearchParams();
  const urlCompanyId = searchParams.get("companyId");
  const companyId = selectedCompanyId || urlCompanyId;

  useEffect(() => {
    if (urlCompanyId && urlCompanyId !== selectedCompanyId) setSelectedCompanyId(urlCompanyId);
  }, [urlCompanyId, selectedCompanyId, setSelectedCompanyId]);

  const toast = useToast();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", departments: "" });
  const [saving, setSaving] = useState(false);

  const canEdit = isOwner(user?.role);

  const loadFacilities = () => {
    if (!companyId) {
      setFacilities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getFacilities(companyId)
      .then((res) => {
        const list = res?.data ?? [];
        setFacilities(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        toast.show(err?.response?.data?.message || "Failed to load facilities", "error");
        setFacilities([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFacilities(); }, [companyId]);

  const resetForm = (f = null) => {
    setEditing(f?._id || null);
    setForm({
      name: f?.name ?? "",
      departments: Array.isArray(f?.departments) ? f.departments.join(", ") : "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.show("Facility name is required", "error");
      return;
    }
    if (!companyId) {
      toast.show("Select a company first", "error");
      return;
    }
    setSaving(true);
    try {
      const departments = form.departments
        ? form.departments.split(",").map((d) => d.trim()).filter(Boolean)
        : [];
      if (editing) {
        await updateFacility(editing, { name: form.name.trim(), departments });
        toast.show("Facility updated", "success");
      } else {
        await createFacility({ companyId, name: form.name.trim(), departments });
        toast.show("Facility created", "success");
      }
      resetForm(null);
      loadFacilities();
    } catch (err) {
      toast.show(err?.response?.data?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const currentCompany = companies.find((c) => c._id === companyId);

  return (
    <div className="dashboard-page">
      <div style={{ marginBottom: "1.5rem" }}>
        <Link to="/dashboard" style={{ color: "var(--primary)", fontSize: "0.9rem" }}>← Dashboard</Link>
      </div>
      <h1 className="dashboard-title">Manage Facilities</h1>
      <p className="dashboard-subtitle" style={{ margin: "0.25rem 0 1rem" }}>
        Create and edit facilities for each company.
      </p>

      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>Company</label>
        <CompanySwitcher />
      </div>

      {!companiesLoading && companies.length === 0 && (
        <p className="dashboard-placeholder">
          No companies yet.{" "}
          <Link to="/dashboard/companies/manage" className="dashboard-cta" style={{ display: "inline-block", marginTop: "0.5rem" }}>
            Create a company first
          </Link>
        </p>
      )}

      {!companyId && companies.length > 0 && (
        <p className="dashboard-placeholder">Select a company above to view and manage facilities.</p>
      )}

      {companyId && (
        <>
          {canEdit && (
            <div style={{ marginBottom: "1.5rem", padding: "1.25rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>{editing ? "Edit Facility" : "Add Facility"}</h2>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 400 }}>
                <label>
                  <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>Facility name *</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "6px" }}
                  />
                </label>
                <label>
                  <span style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>Departments (comma-separated)</span>
                  <input
                    type="text"
                    value={form.departments}
                    onChange={(e) => setForm((f) => ({ ...f, departments: e.target.value }))}
                    placeholder="e.g. Med/Surg, ICU, ER"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "6px" }}
                  />
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="submit" disabled={saving} className="dashboard-cta">
                    {saving ? "Saving…" : editing ? "Update" : "Create"}
                  </button>
                  {editing && (
                    <button type="button" onClick={() => resetForm(null)} className="dashboard-cta--outline">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {loading && <p className="dashboard-placeholder">Loading facilities…</p>}
          {!loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {facilities.map((f) => (
                <div
                  key={f._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem 1.25rem",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: "1.05rem" }}>{f.name}</span>
                    {f.departments?.length > 0 && (
                      <span style={{ display: "block", color: "#64748b", fontSize: "0.9rem" }}>
                        {f.departments.join(", ")}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => resetForm(f)}
                      className="dashboard-cta--outline"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && facilities.length === 0 && (
            <p className="dashboard-placeholder">
              No facilities for {currentCompany?.name || "this company"}. {canEdit ? "Add one above." : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}
