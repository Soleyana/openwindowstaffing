import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BRAND } from "../config";
import { subscribeNewsletter } from "../api/newsletter";
import { useToast } from "../context/ToastContext";

export default function Footer() {
  const { isLoggedIn } = useAuth();
  const toast = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.show("Please enter a valid email", "error");
      return;
    }
    setNewsletterSubmitting(true);
    try {
      await subscribeNewsletter(email);
      toast.show("Subscribed! Check your inbox.", "success");
      setNewsletterEmail("");
    } catch (err) {
      toast.show(err.response?.data?.message || "Subscription failed", "error");
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link to="/" className="footer-logo-link">
            <img src="/images/logo.png" alt={BRAND.companyName} className="footer-logo-img" />
          </Link>
          <p className="footer-desc">
            Connecting healthcare professionals with opportunities nationwide.
          </p>
        </div>
        <Link to="/jobs" className="footer-cta">BROWSE JOBS</Link>
      </div>
      <div className="footer-columns">
        <div className="footer-col">
          <h4 className="footer-col-title">For Candidates</h4>
          <Link to="/jobs" className="footer-col-link">Browse Jobs</Link>
          <Link to="/signup" className="footer-col-link">Create Account</Link>
          <Link to="/login" className="footer-col-link">Sign In</Link>
          <Link to="/my-applications" className="footer-col-link">My Applications</Link>
        </div>
        <div className="footer-col">
          <h4 className="footer-col-title">For Employers</h4>
          {!isLoggedIn && (
            <>
              <Link to="/login" className="footer-col-link">Sign In</Link>
              <Link to="/signup" className="footer-col-link">Sign Up</Link>
            </>
          )}
          <Link to="/post-job" className="footer-col-link">Post a Job</Link>
          <Link to="/about" className="footer-col-link">About Us</Link>
          <Link to="/contact" className="footer-col-link">Contact Us</Link>
          <Link to="/faq" className="footer-col-link">FAQ</Link>
        </div>
        <div className="footer-col">
          <h4 className="footer-col-title">Legals</h4>
          <Link to="/legal" className="footer-col-link">Privacy Policy</Link>
          <Link to="/legal#terms" className="footer-col-link">Terms of Service</Link>
          <Link to="/legal#disclaimers" className="footer-col-link">Disclaimers</Link>
        </div>
        <div className="footer-col">
          <h4 className="footer-col-title">Subscribe To Our Newsletter</h4>
          <p className="footer-col-text">
            Get the latest job openings and staffing insights delivered to your inbox.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="footer-newsletter-form">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={newsletterSubmitting}
              className="footer-newsletter-input"
              aria-label="Email for newsletter"
            />
            <button type="submit" disabled={newsletterSubmitting} className="footer-newsletter-btn">
              {newsletterSubmitting ? "…" : "Subscribe"}
            </button>
          </form>
          <p className="footer-contact-label">Contact:</p>
          <a href={`mailto:${BRAND.contactEmail}`} className="footer-contact-link">{BRAND.contactEmail}</a>
          <p className="footer-contact-phone">{BRAND.contactPhone}</p>
        </div>
      </div>
      <div className="footer-bottom">
        Copyright © {BRAND.companyName} {new Date().getFullYear()}
      </div>
    </footer>
  );
}
