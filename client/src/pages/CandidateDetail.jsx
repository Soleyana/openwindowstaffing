import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useModalA11y } from "../hooks/useModalA11y";
import { getCandidateDetail, verifyDocument } from "../api/recruiterApplications";
import {
  getCandidateCompliance,
  reviewCandidateCompliance,
} from "../api/compliance";
import { createOrFindThreadForCandidate, sendMessage } from "../api/messages";
import { useToast } from "../context/ToastContext";

const COMPLIANCE_BADGE_CLASS = {
  cleared: "badge-compliance-cleared",
  missing: "badge-compliance-missing",
  expiring: "badge-compliance-expiring",
  blocked: "badge-compliance-blocked",
};

export default function CandidateDetail() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [requestDocsLoading, setRequestDocsLoading] = useState(false);
  const reviewModalRef = useRef(null);
  const reviewTriggerRef = useRef(null);

  useEffect(() => {
    if (candidateId) loadDetail();
  }, [candidateId]);

  useModalA11y(reviewModal, reviewModalRef, reviewTriggerRef, () => setReviewModal(false));

  useEffect(() => {
    if (reviewModal && reviewModalRef.current) {
      const first = reviewModalRef.current.querySelector("textarea, button");
      first?.focus();
    }
  }, [reviewModal]);

  async function loadDetail() {
    try {
      setLoading(true);
      const res = await getCandidateDetail(candidateId);
      setData(res.data);
      const companyId = res.data?.suggestedCompanyId;
      if (companyId) {
        try {
          const comp = await getCandidateCompliance(candidateId, companyId);
          setCompliance(comp);
        } catch {
          setCompliance(null);
        }
      } else {
        setCompliance(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load candidate", "error");
      setData(null);
      setCompliance(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(docId, status) {
    try {
      await verifyDocument(docId, status);
      showToast(`Document ${status}`, "success");
      loadDetail();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed", "error");
    }
  }

  async function handleRequestMissingDocs() {
    const companyId = data?.suggestedCompanyId;
    if (!companyId) {
      showToast("No company context. Open from pipeline or application first.", "error");
      return;
    }
    const name = data?.profile?.userId?.name || data?.profile?.userId?.email || "there";
    const missing = compliance?.missing || [];
    const expiring = compliance?.expiringSoon || [];
    const missingStr = missing.length ? `please upload: ${missing.join(", ")}` : "";
    const expList = expiring.map((e) => `${e.type} (expires ${e.expiresAt ? new Date(e.expiresAt).toLocaleDateString() : "soon"})`).join(", ");
    const expStr = expiring.length ? ` The following need renewal soon: ${expList}.` : "";
    const body = `Hi ${name}, to clear you for work${missingStr ? `, ${missingStr}` : ""}.${expStr || ""} Thank you.`;

    setRequestDocsLoading(true);
    try {
      const threadId = await createOrFindThreadForCandidate({ candidateId, companyId });
      if (threadId) {
        await sendMessage(threadId, body);
        showToast("Message sent", "success");
        navigate(`/inbox?thread=${threadId}`);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send message", "error");
    } finally {
      setRequestDocsLoading(false);
    }
  }

  async function handleMarkReviewed() {
    const companyId = data?.suggestedCompanyId;
    if (!companyId) {
      showToast("No company context", "error");
      return;
    }
    setReviewSubmitting(true);
    try {
      await reviewCandidateCompliance(candidateId, reviewNote, companyId);
      showToast("Compliance marked as reviewed", "success");
      setReviewModal(false);
      setReviewNote("");
      loadDetail();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed", "error");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="skeleton-block" style={{ height: 200 }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-page">
        <p>Candidate not found.</p>
        <Link to="/candidates">Back to Candidate Search</Link>
      </div>
    );
  }

  const { profile, documents = [], applications = [], activity = [], suggestedCompanyId } = data;
  const user = profile?.userId || profile;
  const name = user?.name || "—";
  const email = user?.email || "—";
  const canShowCompliance = !!suggestedCompanyId && !!compliance;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header" style={{ marginBottom: "1.5rem" }}>
        <Link to="/candidates" className="btn-link" style={{ marginRight: "1rem" }}>← Back</Link>
        <h1>{name}</h1>
      </div>

      {canShowCompliance && (
        <div className="card compliance-card" style={{ marginBottom: "1.5rem" }}>
          <h3>Compliance (Clear-to-Work)</h3>
          <div className="compliance-status-row" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            <span className={`badge ${COMPLIANCE_BADGE_CLASS[compliance.status] || "badge"}`} style={{ textTransform: "capitalize" }}>
              {compliance.status}
            </span>
            {compliance.lastReviewedAt && (
              <span className="text-muted" style={{ fontSize: "0.9rem" }}>
                Last reviewed: {new Date(compliance.lastReviewedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {compliance.missing?.length > 0 && (
            <p><strong>Missing:</strong> {compliance.missing.join(", ")}</p>
          )}
          {compliance.expiringSoon?.length > 0 && (
            <p><strong>Expiring soon:</strong>{" "}
              {compliance.expiringSoon.map((e) => `${e.type} (${e.expiresAt ? new Date(e.expiresAt).toLocaleDateString() : "—"})`).join(", ")}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            {(compliance.missing?.length > 0 || compliance.expiringSoon?.length > 0) && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleRequestMissingDocs}
                disabled={requestDocsLoading}
              >
                {requestDocsLoading ? "Sending…" : "Request Missing Documents"}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setReviewModal(true)}
            >
              Mark Reviewed
            </button>
          </div>
        </div>
      )}

      {reviewModal && (
        <>
          <div
            className="modal-backdrop"
            onClick={() => setReviewModal(false)}
            aria-hidden="true"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }}
          />
          <div ref={reviewModalRef} className="card" role="dialog" aria-modal="true" aria-labelledby="review-modal-title" tabIndex={-1} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101, minWidth: 320 }}>
            <h3 id="review-modal-title">Mark Compliance Reviewed</h3>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Optional note…"
              rows={3}
              aria-label="Optional note for compliance review"
              style={{ width: "100%", marginBottom: "0.75rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn-primary" onClick={handleMarkReviewed} disabled={reviewSubmitting}>
                {reviewSubmitting ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setReviewModal(false)}>Cancel</button>
            </div>
          </div>
        </>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>Profile</h3>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Phone:</strong> {profile?.phone || "—"}</p>
        <p><strong>Years Experience:</strong> {profile?.yearsExperience ?? "—"}</p>
        <p><strong>Specialties:</strong> {(profile?.specialties || []).join(", ") || "—"}</p>
        <p><strong>Shift Preference:</strong> {profile?.shiftPreference || "—"}</p>
        <p><strong>Travel:</strong> {profile?.travelWillingness || "—"}</p>
        {profile?.summary && <p><strong>Summary:</strong><br />{profile.summary}</p>}
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>Documents</h3>
        {documents.length === 0 ? (
          <p className="text-muted">No documents uploaded.</p>
        ) : (
          <table className="table-basic" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d._id}>
                  <td>{d.type}</td>
                  <td>
                    <span className={`badge badge-${(d.verifiedStatus || "pending").toLowerCase()}`}>
                      {d.verifiedStatus || "Pending"}
                    </span>
                  </td>
                  <td>
                    <a
                      href={`${import.meta.env.VITE_API_URL || "/api"}/documents/${d._id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-link"
                      style={{ cursor: "pointer" }}
                    >
                      Download
                    </a>
                    {d.verifiedStatus !== "Verified" && (
                      <>
                        <button type="button" className="btn-link" style={{ marginLeft: 8 }} onClick={() => handleVerify(d._id, "Verified")}>
                          Verify
                        </button>
                        <button type="button" className="btn-link" style={{ marginLeft: 8 }} onClick={() => handleVerify(d._id, "Rejected")}>
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>Applications</h3>
        {applications.length === 0 ? (
          <p className="text-muted">No applications yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {applications.map((a) => (
              <li key={a._id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee" }}>
                <Link to={`/applicant-pipeline`}>{a.jobId?.title || "Job"}</Link>
                {" — "}
                <span className="badge">{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>Activity</h3>
        {activity.length === 0 ? (
          <p className="text-muted">No activity yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, maxHeight: 300, overflowY: "auto" }}>
            {activity.map((a) => (
              <li key={a._id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee", fontSize: "0.9rem" }}>
                <strong>{a.actionType}</strong>: {a.message}
                {" — "}
                <span className="text-muted">{a.actorUserId?.name || "System"}</span>
                {" "}
                <span className="text-muted">{new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
