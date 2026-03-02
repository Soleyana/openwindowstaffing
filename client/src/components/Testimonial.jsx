import { useState, useCallback, useEffect, useRef } from "react";
import { getTestimonials, submitTestimonial } from "../api/testimonials";
import { getPublicCompanies } from "../api/companies";
import { useToast } from "../context/ToastContext";
import { useModalA11y } from "../hooks/useModalA11y";

export default function Testimonial() {
  const toast = useToast();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const modalRef = useRef(null);
  const writeReviewBtnRef = useRef(null);

  const [form, setForm] = useState({
    companyId: "",
    authorName: "",
    authorRole: "",
    rating: 0,
    message: "",
    consent: false,
    website: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useModalA11y(modalOpen, modalRef, writeReviewBtnRef, () => setModalOpen(false));

  useEffect(() => {
    let cancelled = false;
    getPublicCompanies()
      .then((res) => {
        if (cancelled) return;
        const list = res?.data ?? [];
        setCompanies(Array.isArray(list) ? list : []);
        const firstId = list.length > 0 ? list[0]._id : null;
        setCompanyId(firstId);
        return getTestimonials({ companyId: firstId, limit: 10 });
      })
      .then((res) => {
        if (cancelled || !res) return;
        const rows = res?.data?.rows ?? [];
        setTestimonials(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setTestimonials([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (modalOpen && companies.length > 0 && !form.companyId) {
      setForm((f) => ({ ...f, companyId: companies[0]._id }));
    }
  }, [modalOpen, companies, form.companyId]);

  useEffect(() => {
    if (modalOpen && modalRef.current) {
      const first = modalRef.current.querySelector("input, select, button");
      first?.focus();
    }
  }, [modalOpen]);

  const minSwipeDistance = 50;
  const list = testimonials;
  const t = list[index];

  const goTo = useCallback((i) => {
    setIndex((i + list.length) % list.length);
  }, [list.length]);

  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) goTo(index + 1);
    else if (isRightSwipe) goTo(index - 1);
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, index, goTo]);

  const resetForm = () => {
    setForm({
      companyId: companies.length > 0 ? companies[0]._id : "",
      authorName: "",
      authorRole: "",
      rating: 0,
      message: "",
      consent: false,
      website: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.authorName.trim()) {
      toast.show("Your name is required.", "error");
      return;
    }
    if (!form.message.trim()) {
      toast.show("Your review message is required.", "error");
      return;
    }
    if (form.message.trim().length < 20) {
      toast.show("Review must be at least 20 characters.", "error");
      return;
    }
    if (form.rating < 1 || form.rating > 5) {
      toast.show("Please select a rating.", "error");
      return;
    }
    if (!form.companyId) {
      toast.show("Please select a company.", "error");
      return;
    }
    if (!form.consent) {
      toast.show("You must consent to publish your review.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await submitTestimonial({
        companyId: form.companyId,
        authorName: form.authorName.trim(),
        authorRole: form.authorRole.trim() || undefined,
        rating: form.rating,
        message: form.message.trim(),
        consentToPublish: true,
        website: form.website.trim() || undefined,
      });
      toast.show("Thanks! Your review was submitted and will appear after approval.", "success");
      resetForm();
      setModalOpen(false);
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

  if (loading) {
    return (
      <section className="testimonial-section">
        <div className="testimonial-bg" aria-hidden="true" />
        <div className="testimonial-card-wrap">
          <div className="testimonial-card testimonial-skeleton" aria-busy="true">
            <div className="skeleton-block" style={{ height: 80, marginBottom: "1rem" }} />
            <div className="skeleton-block" style={{ height: 24, width: "60%" }} />
          </div>
        </div>
      </section>
    );
  }

  const openReviewModal = () => setModalOpen(true);

  const renderReviewModal = () => (
    <>
      <div
        className="review-submit-modal-backdrop"
        onClick={() => setModalOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        className="review-submit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        tabIndex={-1}
      >
        <div className="review-submit-modal-header">
          <h2 id="review-modal-title" className="review-submit-modal-title">Write a Review</h2>
          <button
            type="button"
            className="review-submit-modal-close"
            onClick={() => setModalOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="review-submit-modal-body">
          {companies.length > 0 ? (
            <label className="reviews-field">
              <span>Company *</span>
              <select
                value={form.companyId}
                onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))}
                required
                className="reviews-input"
              >
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <p className="review-submit-no-company" style={{ fontSize: "0.9rem", color: "var(--text-light)" }}>
              No companies available for reviews at this time.
            </p>
          )}
          <label className="reviews-field">
            <span>Your name *</span>
            <input
              type="text"
              value={form.authorName}
              onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
              maxLength={80}
              required
              className="reviews-input"
              aria-required="true"
            />
          </label>
          <label className="reviews-field">
            <span>Title (optional)</span>
            <input
              type="text"
              value={form.authorRole}
              onChange={(e) => setForm((f) => ({ ...f, authorRole: e.target.value }))}
              placeholder="e.g. Travel RN"
              maxLength={80}
              className="reviews-input"
            />
          </label>
          <label className="reviews-field">
            <span>Rating *</span>
            <div className="reviews-stars-input" role="group" aria-label="Rating 1 to 5 stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rating: s }))}
                  className={`reviews-star-btn ${s <= form.rating ? "reviews-star-btn--filled" : ""}`}
                  aria-label={`${s} star${s > 1 ? "s" : ""}`}
                  aria-pressed={s <= form.rating}
                >
                  ★
                </button>
              ))}
            </div>
          </label>
          <label className="reviews-field">
            <span>Your review * (min 20 characters)</span>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              maxLength={1200}
              required
              minLength={20}
              rows={4}
              className="reviews-input"
              aria-required="true"
            />
          </label>
          <label className="reviews-field reviews-field-checkbox">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
              required
            />
            <span>I consent to have my review published. *</span>
          </label>
          <div style={{ position: "absolute", left: "-9999px" }}>
            <input
              type="text"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || companies.length === 0}
            className="content-cta-btn"
            style={{ marginTop: "0.5rem" }}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      </div>
    </>
  );

  const emptyState = (
    <section className="testimonial-section">
      <div className="testimonial-bg" aria-hidden="true" />
      <div className="testimonial-card-wrap">
        <div className="testimonial-card">
          <p className="testimonial-text">No reviews yet. Be the first to leave one.</p>
          <button
            ref={writeReviewBtnRef}
            type="button"
            onClick={openReviewModal}
            className="testimonial-write-review-btn"
          >
            Write a Review
          </button>
        </div>
      </div>
      {modalOpen && renderReviewModal()}
    </section>
  );

  if (list.length === 0) {
    return emptyState;
  }

  return (
    <>
      <section className="testimonial-section">
        <div className="testimonial-bg" aria-hidden="true" />
        <div className="testimonial-card-wrap">
          <div
            className="testimonial-card"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            role="region"
            aria-label="Customer testimonials"
          >
            <span className="testimonial-quote" aria-hidden="true">"</span>
            {t?.rating && (
              <div className="testimonial-stars" aria-label={`${t.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={s <= t.rating ? "testimonial-star testimonial-star--filled" : "testimonial-star"}>★</span>
                ))}
              </div>
            )}
            <p className="testimonial-text">{t?.message || t?.text}</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar" />
              <div>
                <span className="testimonial-name">{t?.authorName || t?.name}</span>
                <span className="testimonial-meta">{t?.authorRole || t?.role}</span>
              </div>
            </div>
            <div className="testimonial-dots">
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`testimonial-dot ${i === index ? "testimonial-dot--active" : ""}`}
                  onClick={() => goTo(i)}
                  aria-label={`View testimonial ${i + 1}`}
                  aria-pressed={i === index}
                />
              ))}
            </div>
            <button
              ref={writeReviewBtnRef}
              type="button"
              onClick={openReviewModal}
              className="testimonial-write-review-btn"
            >
              Write a Review
            </button>
          </div>
        </div>
      </section>

      {modalOpen && renderReviewModal()}
    </>
  );
}
