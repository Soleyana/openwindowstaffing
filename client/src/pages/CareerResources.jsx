import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BRAND } from "../config";

const RESOURCES = [
  {
    title: "Resume & Cover Letter Tips",
    desc: "Learn how to tailor your resume for healthcare positions and write a standout cover letter.",
    links: [
      { label: "Resume best practices", href: "#", external: false },
      { label: "Cover letter templates", href: "#", external: false },
    ],
  },
  {
    title: "Interview Preparation",
    desc: "Get ready for healthcare interviews with common questions and best practices.",
    links: [
      { label: "Common interview questions", href: "#", external: false },
      { label: "Behavioral interview tips", href: "#", external: false },
    ],
  },
  {
    title: "Licensing & Credentials",
    desc: "Information about state licensing boards and credentialing requirements.",
    links: [
      { label: "NCSBN (Nurse Licensure)", href: "https://www.ncsbn.org", external: true },
      { label: "State Board Directory", href: "https://www.nursingworld.org/practice-policy/advocacy/state/", external: true },
    ],
  },
  {
    title: "Career Development",
    desc: "Resources for advancing your healthcare career.",
    links: [
      { label: "Continuing education", href: "#", external: false },
      { label: "Certification programs", href: "#", external: false },
    ],
  },
];

export default function CareerResources() {
  return (
    <div className="content-page">
      <Helmet>
        <title>Career Resources – {BRAND.companyName}</title>
        <meta name="description" content={`Career resources, resume tips, interview prep, and licensing info from ${BRAND.companyName}.`} />
      </Helmet>
      <nav className="content-page-breadcrumbs">
        <Link to="/">Home</Link>
        <span> / Career Resources</span>
      </nav>
      <h1 className="content-page-title">Career Resources</h1>
      <p className="content-page-intro" style={{ marginBottom: "2rem", color: "#64748b" }}>
        Tools and information to help you succeed in your healthcare career search.
      </p>

      <div className="career-resources-grid" style={{ display: "grid", gap: "1.5rem" }}>
        {RESOURCES.map((section, i) => (
          <section key={i} className="content-section" style={{ padding: "1.5rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem" }}>{section.title}</h2>
            <p style={{ margin: "0 0 1rem", color: "#64748b" }}>{section.desc}</p>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {section.links.map((link, j) => (
                <li key={j} style={{ marginBottom: "0.35rem" }}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "none" }}>
                      {link.label} ↗
                    </a>
                  ) : (
                    <span style={{ color: "#64748b" }}>{link.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p style={{ marginTop: "2rem", color: "#64748b" }}>
        <Link to="/jobs">Browse current job openings</Link>
      </p>
    </div>
  );
}
