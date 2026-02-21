import { useState } from "react";
import { Link } from "react-router-dom";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="content-page">
      <nav className="content-page-back">
        <Link to="/">← Home</Link>
      </nav>
      <h1 className="content-page-title">Contact Us</h1>
      <nav className="content-page-breadcrumbs">
        <Link to="/">Home</Link>
        <span> / Contact</span>
      </nav>
      <div className="content-page-body">
        <div className="contact-grid">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>
              Whether you&apos;re a healthcare professional looking for your next opportunity or a
              facility seeking staffing solutions, we&apos;re here to help.
            </p>
            <div className="contact-details">
              <p><strong>Email:</strong></p>
              <a href="mailto:jobs@openwindowstaffing.com">jobs@openwindowstaffing.com</a>
              <p><strong>Phone:</strong></p>
              <a href="tel:18883736736">1-888-373-6736</a>
            </div>
          </div>
          <div className="contact-form-wrap">
            <h2>Send a Message</h2>
            {submitted ? (
              <p className="contact-success">Thank you for your message. We&apos;ll get back to you soon.</p>
            ) : (
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="contact-field">
                  <label htmlFor="contact-name">Name</label>
                  <input id="contact-name" type="text" required placeholder="Your name" />
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-email">Email</label>
                  <input id="contact-email" type="email" required placeholder="Your email" />
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-subject">Subject</label>
                  <input id="contact-subject" type="text" placeholder="How can we help?" />
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-message">Message</label>
                  <textarea id="contact-message" rows={5} required placeholder="Your message..." />
                </div>
                <button type="submit" className="content-cta-btn">Send Message</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
