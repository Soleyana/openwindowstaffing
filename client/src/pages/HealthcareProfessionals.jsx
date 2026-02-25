import { Link } from "react-router-dom";

const SECTIONS = [
  {
    id: "RN",
    title: "Registered Nurses",
    description: "Find RN positions across hospitals, clinics, and healthcare facilities. Full-time, part-time, and travel opportunities.",
    category: "RN",
  },
  {
    id: "travel",
    title: "Travel Nurses",
    description: "Explore travel nursing assignments nationwide. Competitive pay, housing, and the flexibility to work where you want.",
    category: "nursing",
  },
  {
    id: "CNA",
    title: "CNAs",
    description: "Certified Nursing Assistant roles in acute care, long-term care, and home health settings.",
    category: "CNA",
  },
  {
    id: "allied",
    title: "Allied Health",
    description: "Positions for radiology techs, lab technicians, respiratory therapists, and other allied health professionals.",
    category: "allied-health",
  },
  {
    id: "ma",
    title: "Medical Assistants",
    description: "Clinical and administrative medical assistant opportunities in physician offices and outpatient clinics.",
    category: "allied-health",
  },
];

export default function HealthcareProfessionals() {
  return (
    <div className="healthcare-professionals-page">
      <nav className="jobs-nav">
        <Link to="/">← Home</Link>
        <span> / </span>
        <span>Healthcare Professionals</span>
      </nav>
      <h1 className="healthcare-professionals-title">Healthcare Professionals</h1>
      <p className="healthcare-professionals-intro">
        Explore career opportunities by specialty. Each category connects you to relevant job openings.
      </p>
      <div className="healthcare-professionals-sections">
        {SECTIONS.map((section) => (
          <section key={section.id} className="healthcare-professionals-card">
            <h2 className="healthcare-professionals-card-title">{section.title}</h2>
            <p className="healthcare-professionals-card-desc">{section.description}</p>
            <Link
              to={`/jobs?category=${section.category}`}
              className="healthcare-professionals-view-btn"
            >
              View Jobs
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}
