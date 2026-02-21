const services = [
  { title: "Travel Assignments", desc: "Explore short and long-term travel nursing opportunities across the country." },
  { title: "Permanent Placement", desc: "Find full-time and part-time positions at top healthcare facilities." },
  { title: "Career Support", desc: "Resume review, interview prep, and ongoing career guidance." },
  { title: "Referral Program", desc: "Earn bonuses when you refer qualified healthcare professionals." },
];

export default function HealthcareProfessionals() {
  return (
    <section id="healthcare-professionals" className="healthcare-pro-section">
      <div className="healthcare-pro-hero">
        <h2 className="healthcare-pro-hero-title">Healthcare Professionals</h2>
        <span className="healthcare-pro-hero-underline" aria-hidden="true" />
      </div>

      <div className="healthcare-pro-content">
        <div className="healthcare-pro-text">
          <p>
            System continuity is essential to providing safe and effective patient care. Our team of industry experts can upgrade your business resilience strategy and delivery models to build an innovative and agile healthcare system that can deliver optimal patient outcomes in the face of unforeseen events.
          </p>
        </div>
        <div className="healthcare-pro-images">
          <div className="healthcare-pro-img-wrap">
            <img src="/healthcare-img-1.jpg" alt="Healthcare professionals collaborating" />
          </div>
          <div className="healthcare-pro-img-wrap">
            <img src="/healthcare-img-2.jpg" alt="Professional workspace" />
          </div>
          <div className="healthcare-pro-img-wrap">
            <img src="/healthcare-img-3.jpg" alt="Team collaboration" />
          </div>
        </div>
      </div>

      <div className="healthcare-pro-services">
        <h3 className="healthcare-pro-services-title">Our Services</h3>
        <div className="healthcare-pro-cards">
          {services.map((s, i) => (
            <div key={i} className="healthcare-pro-card">
              <h4 className="healthcare-pro-card-title">{s.title}</h4>
              <p className="healthcare-pro-card-desc">{s.desc}</p>
              <button type="button" className="healthcare-pro-card-btn">Read More</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
