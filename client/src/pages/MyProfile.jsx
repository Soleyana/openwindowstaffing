import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getMyProfile, updateMyProfile, uploadDocument } from "../api/candidates";
import { downloadDocument, deleteDocument } from "../api/documents";
import { getCandidateCompliance } from "../api/compliance";
import { getMyAssignments } from "../api/assignments";
import { DOCUMENT_TYPES } from "../constants/documentTypes";

const COMPLIANCE_BADGE_CLASS = {
  cleared: "badge-compliance-cleared",
  missing: "badge-compliance-missing",
  expiring: "badge-compliance-expiring",
  blocked: "badge-compliance-blocked",
};

export default function MyProfile() {
  const { user } = useAuth();
  const { show: showToast } = useToast();
  const fileInputRef = useRef(null);
  const [docType, setDocType] = useState(null);
  const [profile, setProfile] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);

  function handleChoose(type) {
    setDocType(type);
    fileInputRef.current?.click();
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadCompliance() {
    if (user?.role !== "applicant") return;
    try {
      let companyId = null;
      let facilityId = null;
      const assignRes = await getMyAssignments();
      const assignments = assignRes.data || [];
      const active = assignments.find((a) => ["accepted", "active"].includes(a.status));
      if (active) {
        companyId = active.companyId?._id || active.companyId;
        facilityId = active.facilityId?._id || active.facilityId;
      }
      const comp = await getCandidateCompliance("me", companyId, facilityId);
      setCompliance(comp);
    } catch {
      setCompliance(null);
    }
  }

  useEffect(() => {
    if (user?.role === "applicant") loadCompliance();
  }, [user?.role]);

  async function loadProfile(skipLoadingState = false) {
    try {
      if (!skipLoadingState) setLoading(true);
      const res = await getMyProfile();
      const profileData = res?.data ?? res;
      setProfile(profileData);
      if (user?.role === "applicant") await loadCompliance();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load profile", "error");
      setProfile({});
    } finally {
      if (!skipLoadingState) setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!profile) return;
    try {
      setSaving(true);
      const res = await updateMyProfile(profile);
      setProfile(res.data);
      setEditMode(false);
      showToast("Profile updated", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update", "error");
    } finally {
      setSaving(false);
    }
  }

  const ACCEPT_TYPES = "application/pdf,image/jpeg,image/png,image/jpg";

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = null;
    if (!file) return;
    const type = docType;
    if (!type) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      showToast("Please select a PDF or image (JPG/PNG)", "error");
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      await uploadDocument(formData);
      showToast(`${type} uploaded successfully`, "success");
      await loadProfile(true);
      await loadCompliance();
    } catch (err) {
      const d = err.response?.data || {};
      const msg = d.message || "Upload failed";
      showToast(d.requestId ? `${msg} (ID: ${d.requestId})` : msg, "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc) {
    if (!doc?._id) return;
    setDownloadingDocId(doc._id);
    try {
      await downloadDocument(doc._id, doc.fileName, (msg, reqId) => {
        showToast(reqId ? `${msg} (${reqId})` : msg, "error");
      });
    } finally {
      setDownloadingDocId(null);
    }
  }

  async function handleDelete(doc) {
    if (!doc?._id) return;
    if (!window.confirm("Are you sure you want to delete this document? You can upload a new one afterwards.")) return;
    setDeletingDocId(doc._id);
    try {
      await deleteDocument(doc._id);
      showToast("Document deleted", "success");
      await loadProfile(true);
      await loadCompliance();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete document", "error");
    } finally {
      setDeletingDocId(null);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="skeleton-block" style={{ height: 200, marginBottom: 16 }} />
        <div className="skeleton-block" style={{ height: 120 }} />
      </div>
    );
  }

  if (user?.role !== "applicant") {
    return (
      <div className="dashboard-page">
        <p>Profile is for applicants only.</p>
      </div>
    );
  }

  const formData = profile || {};
  const docs = formData.documents || [];
  const license = formData.license || {};
  const certs = formData.certifications || [];

  return (
    <div className="dashboard-page">
      {compliance && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Compliance Status</h3>
          <p className="text-muted" style={{ marginBottom: "0.5rem" }}>
            {compliance.requiredTypes?.length
              ? `Required: ${compliance.requiredTypes.join(", ")}`
              : "Upload required credentials (License, BLS, TB, Background) to be cleared for work."}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span className={`badge ${COMPLIANCE_BADGE_CLASS[compliance.status] || "badge"}`} style={{ textTransform: "capitalize" }}>
              {compliance.status}
            </span>
            {compliance.missing?.length > 0 && (
              <span className="text-muted">Missing: {compliance.missing.join(", ")}</span>
            )}
            {compliance.expiringSoon?.length > 0 && (
              <span className="text-muted">
                Expiring: {compliance.expiringSoon.map((e) => `${e.type} (${e.expiresAt ? new Date(e.expiresAt).toLocaleDateString() : "—"})`).join(", ")}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <h1>My Profile</h1>
        {!editMode ? (
          <button type="button" className="btn-primary" onClick={() => setEditMode(true)}>
            Edit Profile
          </button>
        ) : (
          <button type="button" className="btn-secondary" onClick={() => setEditMode(false)}>
            Cancel
          </button>
        )}
      </div>

      {editMode ? (
        <form onSubmit={handleSave} className="profile-form card" style={{ marginBottom: "1.5rem" }}>
          <h3>Contact & Experience</h3>
          <div className="form-row">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="form-row">
            <label>Years of Experience</label>
            <input
              type="number"
              min="0"
              value={formData.yearsExperience ?? ""}
              onChange={(e) => setProfile({ ...profile, yearsExperience: e.target.value ? parseInt(e.target.value, 10) : null })}
            />
          </div>
          <div className="form-row">
            <label>Shift Preference</label>
            <input
              type="text"
              value={formData.shiftPreference || ""}
              onChange={(e) => setProfile({ ...profile, shiftPreference: e.target.value })}
              placeholder="Days, Nights, etc."
            />
          </div>
          <div className="form-row">
            <label>Willing to Travel</label>
            <input
              type="text"
              value={formData.travelWillingness || ""}
              onChange={(e) => setProfile({ ...profile, travelWillingness: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Summary</label>
            <textarea
              rows={4}
              value={formData.summary || ""}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
              placeholder="Brief professional summary..."
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      ) : (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Contact & Experience</h3>
          <p><strong>Phone:</strong> {formData.phone || "—"}</p>
          <p><strong>Years of Experience:</strong> {formData.yearsExperience ?? "—"}</p>
          <p><strong>Shift Preference:</strong> {formData.shiftPreference || "—"}</p>
          <p><strong>Travel:</strong> {formData.travelWillingness || "—"}</p>
          {formData.summary && <p><strong>Summary:</strong><br />{formData.summary}</p>}
        </div>
      )}

      <div className="card">
        <h3>Credentials & Documents</h3>
        <p className="text-muted" style={{ marginBottom: "1rem" }}>
          Upload and manage your documents. Recruiters can verify licenses and certifications.
        </p>

        <div style={{ marginBottom: "1rem" }}>
          <strong>Upload new document:</strong>
          {uploading && <span style={{ marginLeft: "0.5rem", color: "var(--text-muted, #666)" }}>Uploading…</span>}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_TYPES}
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="btn-secondary"
                disabled={uploading}
                onClick={() => handleChoose(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {docs.length > 0 ? (
          <table className="table-basic" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d._id}>
                  <td>{d.fileName || d.type}</td>
                  <td>{d.type}</td>
                  <td>
                    <span className={`badge badge-${d.verifiedStatus?.toLowerCase() || "pending"}`}>
                      {d.verifiedStatus || "Pending"}
                    </span>
                    {d.rejectReason && <span className="text-muted" style={{ display: "block", fontSize: "0.85rem" }}>{d.rejectReason}</span>}
                  </td>
                  <td>{d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString() : "—"}</td>
                  <td>{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : "—"}</td>
                  <td>
                    {d._id && (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                          disabled={downloadingDocId === d._id}
                          onClick={() => handleDownload(d)}
                        >
                          {downloadingDocId === d._id ? "Downloading…" : "Download"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", color: "var(--error, #c33)" }}
                          disabled={deletingDocId === d._id}
                          onClick={() => handleDelete(d)}
                        >
                          {deletingDocId === d._id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">No documents uploaded yet. Use the buttons above to add your resume, license, or certifications.</p>
        )}
      </div>
    </div>
  );
}
