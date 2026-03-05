import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useModalA11y } from "../hooks/useModalA11y";
import { getCandidateDetail, verifyDocument } from "../api/recruiterApplications";
import {
  getCandidateCompliance,
  reviewCandidateCompliance,
} from "../api/compliance";
import { downloadDocument } from "../api/documents";
import { createOrFindThreadForCandidate, sendMessage } from "../api/messages";
import { getAssignments, createAssignment, offerAssignment } from "../api/assignments";
import { createOffer, sendOffer, getOffers } from "../api/offers";
import { getContracts, createContract, sendContract, downloadContract } from "../api/contracts";
import { getFacilities } from "../api/facilities";
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
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [createApp, setCreateApp] = useState(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({ startDate: "", endDate: "", payRate: "", unit: "hour", shiftType: "", hoursPerWeek: "" });
  const [offerModal, setOfferModal] = useState(false);
  const [offerApp, setOfferApp] = useState(null);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerForm, setOfferForm] = useState({ payRate: "", startDate: "", scheduleNotes: "", facilityId: "" });
  const [offers, setOffers] = useState([]);
  const [offeringId, setOfferingId] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [contractActionId, setContractActionId] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const reviewModalRef = useRef(null);
  const reviewTriggerRef = useRef(null);

  useEffect(() => {
    if (candidateId) loadDetail();
  }, [candidateId]);

  useEffect(() => {
    const companyId = data?.suggestedCompanyId;
    if (!companyId || !candidateId) return;
    let cancelled = false;
    getCandidateCompliance(candidateId, companyId, selectedFacilityId || null)
      .then((comp) => { if (!cancelled) setCompliance(comp); })
      .catch(() => { if (!cancelled) setCompliance(null); });
    return () => { cancelled = true; };
  }, [data?.suggestedCompanyId, candidateId, selectedFacilityId]);

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
          const [facRes, compRes] = await Promise.all([
            getFacilities(companyId),
            getCandidateCompliance(candidateId, companyId, selectedFacilityId || null),
          ]);
          setFacilities(facRes.data || []);
          setCompliance(compRes);
        } catch {
          setFacilities([]);
          setCompliance(null);
        }
        try {
          const [assignRes, offersRes] = await Promise.all([
            getAssignments({ companyId, candidateId }),
            getOffers({ companyId, candidateId }),
          ]);
          setAssignments(assignRes.data || []);
          setOffers(offersRes.data || []);
        } catch {
          setAssignments([]);
          setOffers([]);
        }
      } else {
        setFacilities([]);
        setSelectedFacilityId("");
        setCompliance(null);
        setAssignments([]);
        setOffers([]);
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

  function openCreateModal(app) {
    setCreateApp(app);
    setCreateForm({ startDate: "", endDate: "", payRate: "", unit: "hour", shiftType: "", hoursPerWeek: "" });
    setCreateModal(true);
  }

  function openOfferModal(app) {
    setOfferApp(app);
    setOfferForm({ payRate: "", startDate: "", scheduleNotes: "", facilityId: selectedFacilityId || "" });
    setOfferModal(true);
  }

  async function handleCreateAndSendOffer(e) {
    e.preventDefault();
    if (!offerApp?._id || offerSubmitting) return;
    setOfferSubmitting(true);
    try {
      const res = await createOffer({
        applicationId: offerApp._id,
        payRate: offerForm.payRate ? parseFloat(offerForm.payRate) : undefined,
        startDate: offerForm.startDate || undefined,
        scheduleNotes: offerForm.scheduleNotes || undefined,
        facilityId: offerForm.facilityId || undefined,
      });
      const offerId = res.data?._id;
      if (offerId) {
        await sendOffer(offerId);
        showToast("Offer sent", "success");
        setOfferModal(false);
        setOfferApp(null);
        const offersRes = await getOffers({ companyId: data?.suggestedCompanyId, candidateId });
        setOffers(offersRes.data || []);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send offer", "error");
    } finally {
      setOfferSubmitting(false);
    }
  }

  async function handleCreateAssignment(e) {
    e.preventDefault();
    if (!createApp?._id || createSubmitting) return;
    setCreateSubmitting(true);
    try {
      const payRate = parseFloat(createForm.payRate);
      await createAssignment({
        applicationId: createApp._id,
        startDate: createForm.startDate || undefined,
        endDate: createForm.endDate || undefined,
        payRate: !isNaN(payRate) ? { payRate, unit: createForm.unit || "hour", currency: "USD" } : undefined,
        shiftInfo: createForm.shiftType || createForm.hoursPerWeek
          ? { type: createForm.shiftType, hoursPerWeek: createForm.hoursPerWeek ? parseFloat(createForm.hoursPerWeek) : undefined }
          : undefined,
      });
      showToast("Assignment created", "success");
      setCreateModal(false);
      setCreateApp(null);
      const assignRes = await getAssignments({ companyId: data?.suggestedCompanyId, candidateId });
      setAssignments(assignRes.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create assignment", "error");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleOffer(assignId) {
    if (!assignId || offeringId) return;
    setOfferingId(assignId);
    try {
      await offerAssignment(assignId);
      showToast("Offer sent", "success");
      const assignRes = await getAssignments({ companyId: data?.suggestedCompanyId, candidateId });
      setAssignments(assignRes.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send offer", "error");
    } finally {
      setOfferingId(null);
    }
  }

  async function handleCreateContract(offerId) {
    if (!offerId || contractActionId) return;
    setContractActionId(offerId);
    try {
      const res = await createContract({ offerId });
      const c = res.data ?? res;
      setContracts((prev) => {
        const has = prev.some((x) => x._id === c._id);
        return has ? prev : [c, ...prev];
      });
      showToast("Contract created", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create contract", "error");
    } finally {
      setContractActionId(null);
    }
  }

  async function handleSendContract(contractId) {
    if (!contractId || contractActionId) return;
    setContractActionId(contractId);
    try {
      await sendContract(contractId);
      setContracts((prev) => prev.map((c) => (c._id === contractId ? { ...c, status: "sent", sentAt: new Date() } : c)));
      showToast("Contract sent to candidate", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send contract", "error");
    } finally {
      setContractActionId(null);
    }
  }

  async function handleDownloadContract(contractId) {
    if (!contractId || contractActionId) return;
    setContractActionId(contractId);
    try {
      await downloadContract(contractId);
      showToast("Download started", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Download failed", "error");
    } finally {
      setContractActionId(null);
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
          {facilities.length > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span className="text-muted" style={{ fontSize: "0.9rem" }}>Requirements for:</span>
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                style={{ fontSize: "0.9rem" }}
              >
                <option value="">Company default</option>
                {facilities.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </label>
          )}
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
                    {d._id && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", marginRight: 8 }}
                        disabled={downloadingDocId === d._id}
                        onClick={(e) => { e.stopPropagation(); handleDownload(d); }}
                      >
                        {downloadingDocId === d._id ? "Downloading…" : "Download"}
                      </button>
                    )}
                    {d.verifiedStatus !== "Verified" && d._id && (
                      <>
                        <button type="button" className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", marginLeft: 4 }} onClick={(e) => { e.stopPropagation(); handleVerify(d._id, "Verified"); }}>
                          Verify
                        </button>
                        <button type="button" className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", marginLeft: 4 }} onClick={(e) => { e.stopPropagation(); handleVerify(d._id, "Rejected"); }}>
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
        <h3>Assignments</h3>
        {assignments.length === 0 ? (
          <p className="text-muted">No assignments yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {assignments.map((a) => (
              <li key={a._id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span>{a.jobId?.title || "Job"}</span>
                <span className="badge" style={{ textTransform: "capitalize" }}>{a.status}</span>
                {a.payRate?.payRate != null && (
                  <span className="text-muted">${a.payRate.payRate}/{a.payRate.unit || "hr"}</span>
                )}
                {a.status === "drafted" && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                    disabled={offeringId === a._id}
                    onClick={() => handleOffer(a._id)}
                  >
                    {offeringId === a._id ? "Sending…" : "Send Offer"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {suggestedCompanyId && (offers.some((o) => o.status === "accepted") || contracts.length > 0) && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3>Contracts</h3>
          {contracts.length === 0 && !offers.some((o) => o.status === "accepted") ? (
            <p className="text-muted">No contracts yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {offers
                .filter((o) => o.status === "accepted")
                .map((o) => {
                  const offerId = (o._id && (typeof o._id === "string" ? o._id : o._id.toString())) || "";
                  const contract = contracts.find((c) => {
                    const cOfferId = c.offerId?._id ?? c.offerId;
                    return (cOfferId && (typeof cOfferId === "string" ? cOfferId : cOfferId.toString())) === offerId;
                  });
                  const jobTitle = o.jobId?.title || "Job";
                  return (
                    <li key={o._id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span>{jobTitle}</span>
                      {!contract ? (
                        <button
                          type="button"
                          className="btn-link"
                          style={{ fontSize: "0.85rem" }}
                          disabled={contractActionId === o._id}
                          onClick={() => handleCreateContract(o._id)}
                        >
                          {contractActionId === o._id ? "Creating…" : "Create Contract"}
                        </button>
                      ) : contract.status === "draft" ? (
                        <>
                          <span className="badge">Draft</span>
                          <button
                            type="button"
                            className="btn-link"
                            style={{ fontSize: "0.85rem" }}
                            disabled={contractActionId === contract._id}
                            onClick={() => handleSendContract(contract._id)}
                          >
                            {contractActionId === contract._id ? "Sending…" : "Send to Candidate"}
                          </button>
                        </>
                      ) : contract.status === "sent" ? (
                        <span className="badge badge-compliance-expiring">Awaiting signature</span>
                      ) : contract.status === "signed" ? (
                        <>
                          <span className="badge badge-compliance-cleared">Signed</span>
                          <button
                            type="button"
                            className="btn-link"
                            style={{ fontSize: "0.85rem" }}
                            disabled={contractActionId === contract._id}
                            onClick={() => handleDownloadContract(contract._id)}
                          >
                            {contractActionId === contract._id ? "Downloading…" : "Download"}
                          </button>
                        </>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>Applications</h3>
        {applications.length === 0 ? (
          <p className="text-muted">No applications yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {applications.map((a) => {
              const isWithdrawn = (a.status || "").toLowerCase() === "withdrawn";
              return (
                <li key={a._id} style={{ padding: "0.5rem 0", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <Link to="/applicant-pipeline">{a.jobId?.title || "Job"}</Link>
                  {" — "}
                  <span className="badge">{a.status}</span>
                  {!isWithdrawn && suggestedCompanyId && (
                    <>
                      <button
                        type="button"
                        className="btn-link"
                        style={{ fontSize: "0.85rem" }}
                        onClick={() => openOfferModal(a)}
                      >
                        Create Offer
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        style={{ fontSize: "0.85rem" }}
                        onClick={() => openCreateModal(a)}
                      >
                        Create Assignment
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {offerModal && offerApp && (
        <>
          <div className="modal-backdrop" onClick={() => setOfferModal(false)} aria-hidden="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }} />
          <div className="card" role="dialog" aria-modal="true" aria-labelledby="create-offer-title" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101, minWidth: 360 }}>
            <h3 id="create-offer-title">Create & Send Offer – {offerApp.jobId?.title || "Application"}</h3>
            <form onSubmit={handleCreateAndSendOffer}>
              <div className="form-row" style={{ marginBottom: "0.75rem" }}>
                <label>Pay Rate</label>
                <input type="number" step="0.01" placeholder="e.g. 45" value={offerForm.payRate} onChange={(e) => setOfferForm((f) => ({ ...f, payRate: e.target.value }))} />
              </div>
              <div className="form-row" style={{ marginBottom: "0.75rem" }}>
                <label>Start Date</label>
                <input type="date" value={offerForm.startDate} onChange={(e) => setOfferForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              {facilities.length > 0 && (
                <div className="form-row" style={{ marginBottom: "0.75rem" }}>
                  <label>Facility (optional)</label>
                  <select value={offerForm.facilityId} onChange={(e) => setOfferForm((f) => ({ ...f, facilityId: e.target.value }))}>
                    <option value="">— None —</option>
                    {facilities.map((f) => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-row" style={{ marginBottom: "0.75rem" }}>
                <label>Notes (optional)</label>
                <textarea rows={2} placeholder="Shift/schedule notes" value={offerForm.scheduleNotes} onChange={(e) => setOfferForm((f) => ({ ...f, scheduleNotes: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button type="submit" className="btn-primary" disabled={offerSubmitting}>{offerSubmitting ? "Sending…" : "Create & Send Offer"}</button>
                <button type="button" className="btn-secondary" onClick={() => setOfferModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </>
      )}

      {createModal && createApp && (
        <>
          <div className="modal-backdrop" onClick={() => setCreateModal(false)} aria-hidden="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }} />
          <div className="card" role="dialog" aria-modal="true" aria-labelledby="create-assignment-title" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101, minWidth: 360 }}>
            <h3 id="create-assignment-title">Create Assignment from {createApp.jobId?.title || "Application"}</h3>
            <form onSubmit={handleCreateAssignment}>
              <div className="form-row" style={{ marginBottom: "0.75rem" }}>
                <label>Start Date</label>
                <input type="date" value={createForm.startDate} onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="form-row" style={{ marginBottom: "0.75rem" }}>
                <label>End Date</label>
                <input type="date" value={createForm.endDate} onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div className="form-row" style={{ marginBottom: "0.75rem" }}>
                <label>Pay Rate</label>
                <input type="number" step="0.01" placeholder="e.g. 45" value={createForm.payRate} onChange={(e) => setCreateForm((f) => ({ ...f, payRate: e.target.value }))} />
              </div>
              <div className="form-row" style={{ marginBottom: "0.75rem" }}>
                <label>Unit</label>
                <select value={createForm.unit} onChange={(e) => setCreateForm((f) => ({ ...f, unit: e.target.value }))}>
                  <option value="hour">Per hour</option>
                  <option value="shift">Per shift</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button type="submit" className="btn-primary" disabled={createSubmitting}>{createSubmitting ? "Creating…" : "Create"}</button>
                <button type="button" className="btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </>
      )}

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
