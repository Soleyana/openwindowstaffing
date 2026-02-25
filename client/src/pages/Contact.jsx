import { useState } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../config";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const mailto = `mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(subject || `Contact from ${BRAND.companyName}`)}&body=${encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    )}`;
    window.location.href = mailto;
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
              <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>
              <p><strong>Phone:</strong></p>
              <a href={`tel:${BRAND.contactPhone.replace(/\D/g, "")}`}>{BRAND.contactPhone}</a>
            </div>
          </div>
          <div className="contact-form-wrap">
            <h2>Send a Message</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="contact-field">
                <label htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="contact-field">
                <label htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="contact-field">
                <label htmlFor="contact-subject">Subject</label>
                <input
                  id="contact-subject"
                  type="text"
                  placeholder="How can we help?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="contact-field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  rows={5}
                  required
                  placeholder="Your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button type="submit" className="content-cta-btn">Send Message</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
