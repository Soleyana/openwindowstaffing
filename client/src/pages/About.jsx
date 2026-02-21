import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="content-page">
      <h1 className="content-page-title">About Us</h1>
      <nav className="content-page-breadcrumbs">
        <Link to="/">Home</Link>
        <span> / About Us</span>
      </nav>
      <div className="content-page-body">
        <section className="content-section">
          <h2>Who We Are</h2>
          <p>
            Open Window Staffing connects healthcare professionals with leading facilities nationwide.
            We specialize in nursing, allied health, and clinical staffing for hospitals, clinics, and
            healthcare systems. Our mission is to match the right talent with the right opportunity.
          </p>
        </section>
        <section className="content-section">
          <h2>Our Mission</h2>
          <p>
            To support healthcare organizations with qualified staffing solutions while empowering
            clinicians to advance their careers. We believe every healthcare professional deserves
            access to rewarding opportunities that make a difference.
          </p>
        </section>
        <section className="content-section">
          <h2>Our Team</h2>
          <p>
            Our recruiting team brings decades of healthcare staffing experience. We understand the
            unique needs of hospitals and the aspirations of nurses, therapists, and allied professionals.
          </p>
        </section>
        <section className="content-section">
          <h2>Community</h2>
          <p>
            We partner with healthcare facilities to address staffing shortages and support patient care.
            Whether you&apos;re seeking travel positions, per diem work, or permanent roles, we&apos;re here to help.
          </p>
        </section>
        <div className="content-page-cta">
          <Link to="/jobs" className="content-cta-btn">Browse Healthcare Jobs</Link>
          <Link to="/contact" className="content-cta-btn content-cta-btn--outline">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
