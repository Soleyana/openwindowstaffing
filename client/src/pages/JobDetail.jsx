import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../constants/roles";
import { useToast } from "../context/ToastContext";
import { BRAND } from "../config";
import { trackEvent } from "../components/Analytics";
import { getJobById } from "../api/jobs";
import { applyToJob, checkApplied } from "../api/applications";

const SITE_URL = import.meta.env.VITE_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [coverMessage, setCoverMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getJobById(id);
        if (!cancelled) setJob(data.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!job || !isLoggedIn || user?.role !== ROLES.APPLICANT) return;
    let cancelled = false;
    async function check() {
      try {
        const data = await checkApplied(job._id);
        if (!cancelled) setApplied(data.applied || false);
      } catch {
        if (!cancelled) setApplied(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [job, isLoggedIn, user?.role]);

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applyToJob(job._id, coverMessage);
      setApplied(true);
      setShowApply(false);
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || "Failed to apply", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="jobs-page"><p className="jobs-loading">Loading…</p></div>;
  if (error || !job) return <div className="jobs-page"><p className="jobs-error">This job is no longer available.</p><p className="jobs-error-sub">It may have been filled or removed by the employer.</p><Link to="/jobs">← Back to jobs</Link></div>;

  const jobTypeLabel = job.jobType?.replace("-", " ") || "";
  const postedDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
  const jobDesc = job.description ? String(job.description).slice(0, 160).replace(/\s+/g, " ").trim() + "…" : `${job.title} – ${job.company || ""} at ${BRAND.companyName}`;

  return (
    <div className="jobs-page">
      <Helmet>
        <title>{job.title} – {BRAND.companyName}</title>
        <meta name="description" content={jobDesc} />
        <meta property="og:title" content={`${job.title} – ${BRAND.companyName}`} />
        <meta property="og:description" content={jobDesc} />
        <meta property="og:type" content="website" />
        {SITE_URL && <meta property="og:url" content={`${SITE_URL}/jobs/${job._id}`} />}
      </Helmet>
      <nav className="jobs-nav">
        <Link to="/jobs">← Back to jobs</Link>
      </nav>
      <article className="job-detail">
        <div className="job-detail-header">
          <h1 className="job-detail-title">{job.title}</h1>
          <span className="job-detail-badge">{jobTypeLabel}</span>
        </div>
        <div className="job-detail-meta">
          <span>🏢 {job.company}</span>
          <span>📍 {job.location}</span>
          {job.payRate && <span>💰 {job.payRate}</span>}
          {postedDate && <span>📅 Posted {postedDate}</span>}
        </div>
        <div className="job-detail-description">
          <h3>Description</h3>
          <p>{job.description}</p>
        </div>
        {isLoggedIn && user?.role === ROLES.APPLICANT && (
          <div className="job-detail-apply">
            {applied ? (
              <p className="job-detail-applied">✓ You have applied to this job</p>
            ) : (
              <>
                <button type="button" className="job-detail-apply-btn" onClick={() => { trackEvent("apply_button_click", { job_id: job._id, job_title: job.title }); navigate(`/apply/${job._id}`); }}>
                  Apply for this job
                </button>
                {showApply && (
                  <form onSubmit={handleApply} className="job-detail-apply-form">
                    <label htmlFor="cover-msg">Cover message (optional)</label>
                    <textarea id="cover-msg" value={coverMessage} onChange={(e) => setCoverMessage(e.target.value)} rows={4} placeholder="Introduce yourself..." />
                    <div className="job-detail-apply-actions">
                      <button type="submit" className="auth-submit-btn" disabled={submitting}>{submitting ? "Submitting…" : "Submit application"}</button>
                      <button type="button" className="job-detail-apply-cancel" onClick={() => setShowApply(false)}>Cancel</button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        )}
        {!isLoggedIn && (
          <p className="job-detail-signin-prompt">
            <Link to="/login">Sign in</Link> as a candidate to apply for this job.
          </p>
        )}
      </article>
    </div>
  );
}
