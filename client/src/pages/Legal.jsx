import { Link } from "react-router-dom";
import { BRAND } from "../config";

export default function Legal() {
  return (
    <div className="content-page">
      <h1 className="content-page-title">Legal</h1>
      <nav className="content-page-breadcrumbs">
        <Link to="/">Home</Link>
        <span> / Legal</span>
      </nav>
      <div className="content-page-body">
        <section id="privacy" className="content-section">
          <h2>Privacy Policy</h2>
          <p>
            {BRAND.companyName} respects your privacy. We collect information you provide when creating an account,
            applying for jobs, or contacting us. We use this to match you with opportunities and communicate about
            your applications. We do not sell your personal information to third parties.
          </p>
        </section>
        <section id="terms" className="content-section">
          <h2>Terms of Service</h2>
          <p>
            By using this site, you agree to use it in good faith. Job postings and applications are subject to
            verification. {BRAND.companyName} reserves the right to remove content or suspend accounts that violate
            our policies. Contact us at {BRAND.contactEmail} with questions.
          </p>
        </section>
      </div>
    </div>
  );
}
