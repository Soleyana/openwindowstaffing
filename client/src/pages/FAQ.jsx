import { Link } from "react-router-dom";

const faqs = [
  {
    category: "General Questions",
    items: [
      { q: "What types of healthcare positions do you staff?", a: "We staff nurses (RN, LPN), allied health professionals (RT, PT, OT, lab, imaging), and other clinical roles for hospitals, clinics, and healthcare systems." },
      { q: "What geographic areas do you serve?", a: "We connect healthcare professionals with opportunities nationwide—travel, per diem, and permanent positions across the United States." },
    ],
  },
  {
    category: "For Candidates",
    items: [
      { q: "How do I apply for a job?", a: "Create an account as a candidate, then search jobs and click Apply on any position. You can add an optional cover message." },
      { q: "How do I sign up?", a: "Click Sign Up in the top right and choose &quot;Job seeker / Candidate&quot; to create your profile." },
      { q: "Where can I see my applications?", a: "After signing in, go to My Applications from your account menu to track all positions you&apos;ve applied to." },
    ],
  },
  {
    category: "For Employers",
    items: [
      { q: "How do I post a job?", a: "Recruiter access is by invite only. Contact the site owner to request access. Once invited, use Post a Job to create listings and manage applicants from My Jobs." },
      { q: "How do I view applicants?", a: "Sign in as a recruiter and go to My Jobs. Click &quot;View applicants&quot; on any job to see candidates who applied." },
    ],
  },
];

export default function FAQ() {
  return (
    <div className="content-page">
      <h1 className="content-page-title">FAQ</h1>
      <nav className="content-page-breadcrumbs">
        <Link to="/">Home</Link>
        <span> / FAQ</span>
      </nav>
      <div className="content-page-body">
        {faqs.map((section) => (
          <section key={section.category} className="content-section">
            <h2>{section.category}</h2>
            <div className="faq-list">
              {section.items.map((item, i) => (
                <div key={i} className="faq-item">
                  <h3 className="faq-question">{item.q}</h3>
                  <p className="faq-answer">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
        <div className="content-page-cta">
          <Link to="/contact" className="content-cta-btn">Still have questions? Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
