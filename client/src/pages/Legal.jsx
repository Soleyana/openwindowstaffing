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
          <p className="legal-updated">Last updated: {new Date().toLocaleDateString("en-US")}</p>
          <p>
            {BRAND.companyName} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy.
            This Privacy Policy describes how we collect, use, disclose, and safeguard your information when you use
            our healthcare staffing platform.
          </p>
          <h3>Information We Collect</h3>
          <p>
            We collect information you provide directly: name, email, phone, address, resume, work history, credentials,
            and other application materials. We also collect usage data (IP address, browser type, pages visited) to
            improve our services.
          </p>
          <h3>How We Use Your Information</h3>
          <p>
            We use your information to match you with job opportunities, communicate about applications, verify
            credentials, and provide customer support. We may share your information with employers and facilities
            when you apply for positions through our platform.
          </p>
          <h3>Data Security</h3>
          <p>
            We use industry-standard security measures to protect your data. Your information is stored securely and
            accessed only by authorized personnel. We do not sell your personal information to third parties.
          </p>
          <h3>Your Rights</h3>
          <p>
            You may request access, correction, or deletion of your personal information by contacting us at{" "}
            <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>. You may opt out of marketing emails at
            any time.
          </p>
        </section>
        <section id="terms" className="content-section">
          <h2>Terms of Service</h2>
          <p className="legal-updated">Last updated: {new Date().toLocaleDateString("en-US")}</p>
          <p>
            By accessing or using the {BRAND.companyName} platform, you agree to be bound by these Terms of Service.
          </p>
          <h3>Eligibility</h3>
          <p>
            You must be at least 18 years old and legally authorized to work in the United States to use our platform.
            You represent that all information you provide is accurate and complete.
          </p>
          <h3>Use of the Service</h3>
          <p>
            You agree to use the platform in good faith. Job postings and applications are subject to verification.
            You will not misrepresent your credentials, submit false information, or use the service for any
            unlawful purpose.
          </p>
          <h3>Account Termination</h3>
          <p>
            {BRAND.companyName} reserves the right to suspend or terminate accounts that violate these terms, pose a
            security risk, or engage in fraudulent activity. We may remove content that violates our policies.
          </p>
          <h3>Disclaimer</h3>
          <p>
            We provide a platform to connect healthcare professionals with employers. We do not guarantee placement,
            and we are not responsible for the conduct of employers or candidates. Background checks and credential
            verification are the responsibility of the hiring parties.
          </p>
          <h3>Contact</h3>
          <p>
            Questions about these terms? Contact us at{" "}
            <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a> or {BRAND.contactPhone}.
          </p>
        </section>
        <section id="disclaimers" className="content-section">
          <h2>Disclaimers</h2>
          <h3>Equal Opportunity Employer</h3>
          <p>
            {BRAND.companyName} is committed to equal opportunity in employment. We do not discriminate on the basis of
            race, color, religion, sex, national origin, age, disability, veteran status, or any other characteristic
            protected by applicable law. Job postings and placements are made without regard to these factors.
          </p>
          <h3>Not Medical Advice / HIPAA Note</h3>
          <p>
            This platform facilitates staffing connections between healthcare professionals and employers. We do not
            provide medical advice, diagnosis, or treatment. Employers and facilities using our platform are responsible
            for their own HIPAA compliance, patient privacy practices, and clinical credentialing. We encourage all
            users to maintain appropriate safeguards for protected health information.
          </p>
        </section>
      </div>
    </div>
  );
}
