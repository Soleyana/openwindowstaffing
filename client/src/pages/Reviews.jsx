import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPublicCompanies } from "../api/companies";
import { submitTestimonial } from "../api/testimonials";
import { useToast } from "../context/ToastContext";

export default function Reviews() {
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getPublicCompanies()
      .then((res) => {
        const list = res?.data ?? [];
        setCompanies(Array.isArray(list) ? list : []);
        if (list.length > 0 && !companyId) setCompanyId(list[0]._id);
      })
      .catch(() => setCompanies([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) { toast.show("You must consent to publish your review.", "error"); return; }
    if (!authorName.trim()) { toast.show("Your name is required.", "error"); return; }
    if (!message.trim()) { toast.show("Your review message is required.", "error"); return; }
    if (rating < 1 || rating > 5) { toast.show("Please select a rating.", "error"); return; }
    if (!companyId) { toast.show("Please select a company.", "error"); return; }
    setSubmitting(true);
    try {
      await submitTestimonial({
        companyId, authorName: authorName.trim(), authorRole: authorRole.trim() || undefined,
        rating, title: title.trim() || undefined, message: message.trim(),
        email: email.trim() || undefined, consentToPublish: true, website: website.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      if (err?.response?.status === 429) {
        toast.show("Too many submissions. Try again in an hour.", "error");
      } else {
        toast.show(err?.response?.data?.message || "Failed to submit.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="content-page">
        <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", padding: "3rem 1.5rem" }}>
          <h1 className="content-page-title">Thank you!</h1>
          <p style={{ fontSize: "1.1rem", color: "var(--text-light)" }}>
            Your review will appear after approval.
          </p>
          <Link to="/" className="content-cta-btn" style={{ marginTop: "1.5rem" }}>Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page">
      <div style={{ marginBottom: "1rem" }}><Link to="/" style={{ color: "var(--primary)", fontSize: "0.9rem" }}>← Home</Link></div>
      <h1 className="content-page-title">Leave a Review</h1>
      <p className="content-page-intro">Share your experience. Your feedback helps others.</p>
      <form onSubmit={handleSubmit} className="reviews-form" style={{ maxWidth: 520, marginTop: "2rem" }}>
        <label className="reviews-field"><span>Company *</span>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} required className="reviews-input">
            <option value="">Select company…</option>
            {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </label>
        <label className="reviews-field"><span>Your name *</span>
          <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} maxLength={80} required className="reviews-input" />
        </label>
        <label className="reviews-field"><span>Your role (optional)</span>
          <input type="text" value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} maxLength={80} className="reviews-input" />
        </label>
        <label className="reviews-field"><span>Rating *</span>
          <div className="reviews-stars-input">
            {[1,2,3,4,5].map((s) => (
              <button key={s} type="button" onClick={() => setRating(s)} className={"reviews-star-btn " + (s <= rating ? "reviews-star-btn--filled" : "")}>★</button>
            ))}
          </div>
        </label>
        <label className="reviews-field"><span>Title (optional)</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="reviews-input" />
        </label>
        <label className="reviews-field"><span>Your review *</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1200} required rows={5} className="reviews-input" />
        </label>
        <label className="reviews-field"><span>Email (optional)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="reviews-input" />
        </label>
        <label className="reviews-field" style={{ display: "flex", gap: "0.5rem" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I consent to have my review published. *</span>
        </label>
        <div style={{ position: "absolute", left: "-9999px" }}><input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} aria-hidden="true" /></div>
        <button type="submit" disabled={submitting} className="content-cta-btn" style={{ marginTop: "1rem" }}>{submitting ? "Submitting…" : "Submit"}</button>
      </form>
    </div>
  );
}
