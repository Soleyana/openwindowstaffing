import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { trackEvent } from "../components/Analytics";
import { submitFullApplication } from "../api/applications";
import { getJobById } from "../api/jobs";
import { US_STATES } from "../constants/usStates";
import { EXPERIENCE_YEARS, LICENSE_TYPES } from "../constants/applicationForm";

const sectionStyle = { marginBottom: "1.75rem" };
const sectionTitle = { margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 600, color: "#1e293b" };
const row = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" };
const fullWidth = { gridColumn: "1 / -1" };
const fieldStyle = { display: "flex", flexDirection: "column", gap: "0.25rem" };
const inputStyle = { padding: "0.75rem 1rem", fontSize: "1rem", border: "1px solid #e2e8f0", borderRadius: "8px" };
const textareaStyle = { ...inputStyle, minHeight: "120px", resize: "vertical", boxSizing: "border-box" };
const labelStyle = { fontSize: "0.9rem", fontWeight: 500, color: "#475569" };

export default function ApplyJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // Section 1: Personal info
  const [firstName, setFirstName] = useState(user?.name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(user?.name?.split(" ").slice(1).join(" ") || "");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");

  // Section 2: Work authorization
  const [authorizedToWork, setAuthorizedToWork] = useState("");
  const [requireSponsorship, setRequireSponsorship] = useState("");

  // Section 3: Experience
  const [yearsExperience, setYearsExperience] = useState("");
  const [hasLicense, setHasLicense] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Section 4: Travel & preferences
  const [willingToTravel, setWillingToTravel] = useState("");
  const [shiftPreference, setShiftPreference] = useState("");
  const [availableStartDate, setAvailableStartDate] = useState("");
  const [certifications, setCertifications] = useState("");

  // Cover letter, resume, signature
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().slice(0, 10));
  const [signature, setSignature] = useState("");
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobAvailable, setJobAvailable] = useState(null);

  useEffect(() => {
    if (!jobId) {
      setJobAvailable(false);
      return;
    }
    let cancelled = false;
    setJobAvailable(null);
    getJobById(jobId)
      .then((res) => { if (!cancelled && res?.data) setJobAvailable(true); })
      .catch(() => { if (!cancelled) setJobAvailable(false); });
    return () => { cancelled = true; };
  }, [jobId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobId) {
      toast.show("Invalid link. Please apply from the job listing.", "error");
      return;
    }
    if (!user) {
      setError("Please sign in to apply.");
      return;
    }
    if (!agreePrivacy) {
      setError("You must agree to the Privacy Policy to submit.");
      return;
    }
    if (!signature.trim()) {
      setError("Please type your full name to sign.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("street", street.trim());
      formData.append("city", city.trim());
      formData.append("state", state);
      formData.append("zip", zip.trim());
      formData.append("email", email.trim());
      formData.append("phone", phone.trim());
      formData.append("authorizedToWork", authorizedToWork);
      formData.append("requireSponsorship", requireSponsorship);
      formData.append("yearsExperience", yearsExperience);
      formData.append("hasLicense", hasLicense);
      formData.append("licenseNumber", licenseNumber.trim());
      formData.append("licenseState", licenseState);
      formData.append("licenseType", licenseType);
      formData.append("specialty", specialty.trim());
      formData.append("willingToTravel", willingToTravel);
      formData.append("shiftPreference", shiftPreference.trim());
      formData.append("availableStartDate", availableStartDate);
      formData.append("certifications", certifications.trim());
      formData.append("coverLetter", coverLetter.trim());
      formData.append("signatureDate", signatureDate);
      formData.append("signature", signature.trim());
      if (resumeFile) formData.append("resume", resumeFile);

      await submitFullApplication(formData);
      trackEvent("application_submit", { job_id: jobId });
      toast.show("Application submitted successfully.");
      navigate("/my-applications");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Application failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Apply for Job</h1>
          <p style={styles.subtitle}>Please sign in to apply.</p>
          <Link to="/login" style={styles.link}>Sign in</Link>
        </div>
      </div>
    );
  }

  if (jobAvailable === false) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Job No Longer Available</h1>
          <p style={styles.subtitle}>This job has been filled or removed by the employer.</p>
          <Link to="/jobs" style={styles.link}>Browse other jobs</Link>
        </div>
      </div>
    );
  }

  if (jobAvailable === null) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Apply for Job</h1>
          <p style={styles.subtitle}>Checking job availability…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Healthcare Job Application</h1>
        <p style={styles.subtitle}>Complete all sections. Fields marked with * are required.</p>

        <form onSubmit={handleSubmit} style={styles.form} className="apply-job-form">
          {/* Section 1: Personal Info */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>1. Personal Information</h2>
            <div style={row}>
              <div style={fieldStyle}>
                <label htmlFor="firstName" style={labelStyle}>First Name *</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} placeholder="First name" />
              </div>
              <div style={fieldStyle}>
                <label htmlFor="lastName" style={labelStyle}>Last Name *</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} placeholder="Last name" />
              </div>
              <div style={fullWidth}>
                <div style={fieldStyle}>
                  <label htmlFor="street" style={labelStyle}>Street Address *</label>
                  <input id="street" type="text" value={street} onChange={(e) => setStreet(e.target.value)} required style={inputStyle} placeholder="123 Main St" />
                </div>
              </div>
              <div style={fieldStyle}>
                <label htmlFor="city" style={labelStyle}>City *</label>
                <input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} required style={inputStyle} placeholder="City" />
              </div>
              <div style={fieldStyle}>
                <label htmlFor="state" style={labelStyle}>State *</label>
                <select id="state" value={state} onChange={(e) => setState(e.target.value)} required style={inputStyle}>
                  {US_STATES.map((s) => (
                    <option key={s.value || "empty"} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label htmlFor="zip" style={labelStyle}>Zip Code *</label>
                <input id="zip" type="text" value={zip} onChange={(e) => setZip(e.target.value)} required style={inputStyle} placeholder="12345" />
              </div>
              <div style={fieldStyle}>
                <label htmlFor="email" style={labelStyle}>Email *</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
              </div>
              <div style={fieldStyle}>
                <label htmlFor="phone" style={labelStyle}>Phone *</label>
                <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} placeholder="(555) 123-4567" />
              </div>
            </div>
          </section>

          {/* Section 2: Work Authorization */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>2. Work Authorization</h2>
            <div style={row}>
              <div style={fieldStyle}>
                <label htmlFor="authorizedToWork" style={labelStyle}>Are you legally authorized to work in the United States? *</label>
                <select id="authorizedToWork" value={authorizedToWork} onChange={(e) => setAuthorizedToWork(e.target.value)} required style={inputStyle}>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label htmlFor="requireSponsorship" style={labelStyle}>Do you require visa sponsorship now or in the future? *</label>
                <select id="requireSponsorship" value={requireSponsorship} onChange={(e) => setRequireSponsorship(e.target.value)} required style={inputStyle}>
                  <option value="">Select</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 3: Experience & License */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>3. Experience & License</h2>
            <div style={row}>
              <div style={fieldStyle}>
                <label htmlFor="yearsExperience" style={labelStyle}>Years of Experience *</label>
                <select id="yearsExperience" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} required style={inputStyle}>
                  {EXPERIENCE_YEARS.map((o) => (
                    <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label htmlFor="hasLicense" style={labelStyle}>Do you hold a professional license? *</label>
                <select id="hasLicense" value={hasLicense} onChange={(e) => setHasLicense(e.target.value)} required style={inputStyle}>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              {hasLicense === "yes" && (
                <>
                  <div style={fieldStyle}>
                    <label htmlFor="licenseNumber" style={labelStyle}>License Number</label>
                    <input id="licenseNumber" type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} style={inputStyle} placeholder="License number" />
                  </div>
                  <div style={fieldStyle}>
                    <label htmlFor="licenseState" style={labelStyle}>License State</label>
                    <select id="licenseState" value={licenseState} onChange={(e) => setLicenseState(e.target.value)} style={inputStyle}>
                      {US_STATES.map((s) => (
                        <option key={s.value || "empty"} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={fieldStyle}>
                    <label htmlFor="licenseType" style={labelStyle}>License Type</label>
                    <select id="licenseType" value={licenseType} onChange={(e) => setLicenseType(e.target.value)} style={inputStyle}>
                      {LICENSE_TYPES.map((o) => (
                        <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div style={{ ...fieldStyle, ...(hasLicense === "yes" ? {} : fullWidth) }}>
                <label htmlFor="specialty" style={labelStyle}>Specialty / Area of Practice</label>
                <input id="specialty" type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={inputStyle} placeholder="e.g. Critical Care, Pediatrics" />
              </div>
            </div>
          </section>

          {/* Section 4: Travel & Preferences */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>4. Travel & Preferences</h2>
            <div style={row}>
              <div style={fieldStyle}>
                <label htmlFor="willingToTravel" style={labelStyle}>Are you willing to travel? *</label>
                <select id="willingToTravel" value={willingToTravel} onChange={(e) => setWillingToTravel(e.target.value)} required style={inputStyle}>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="limited">Limited / Regional only</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label htmlFor="shiftPreference" style={labelStyle}>Shift Preference</label>
                <select id="shiftPreference" value={shiftPreference} onChange={(e) => setShiftPreference(e.target.value)} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="days">Days</option>
                  <option value="nights">Nights</option>
                  <option value="evenings">Evenings</option>
                  <option value="variable">Variable / Flexible</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label htmlFor="availableStartDate" style={labelStyle}>Earliest Start Date</label>
                <input id="availableStartDate" type="date" value={availableStartDate} onChange={(e) => setAvailableStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label htmlFor="certifications" style={labelStyle}>Certifications (e.g. BLS, ACLS, PALS)</label>
                <input id="certifications" type="text" value={certifications} onChange={(e) => setCertifications(e.target.value)} style={inputStyle} placeholder="Comma-separated" />
              </div>
            </div>
          </section>

          {/* Cover Letter */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>Cover Letter</h2>
            <div style={fieldStyle}>
              <label htmlFor="coverLetter" style={labelStyle}>Additional notes or cover letter</label>
              <textarea id="coverLetter" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={5} style={textareaStyle} placeholder="Introduce yourself and highlight relevant experience..." />
            </div>
          </section>

          {/* Resume */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>Resume</h2>
            <div style={fieldStyle}>
              <label htmlFor="resume" style={labelStyle}>Resume (PDF) *</label>
              <input id="resume" type="file" accept=".pdf,application/pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} required style={styles.fileInput} />
            </div>
          </section>

          {/* Signature & Date */}
          <section style={{ ...sectionStyle, padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <h2 style={sectionTitle}>Agreement & Signature</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "#64748b" }}>
              I certify that the information provided is accurate and agree to the{" "}
              <Link to="/legal" target="_blank" rel="noopener noreferrer" style={styles.link}>Privacy Policy</Link>.
            </p>
            <div style={row} className="apply-job-row">
              <div style={fieldStyle}>
                <label htmlFor="signatureDate" style={labelStyle}>Date *</label>
                <input id="signatureDate" type="date" value={signatureDate} onChange={(e) => setSignatureDate(e.target.value)} required style={inputStyle} />
              </div>
              <div style={fieldStyle}>
                <label htmlFor="signature" style={labelStyle}>Full Name (Signature) *</label>
                <input id="signature" type="text" value={signature} onChange={(e) => setSignature(e.target.value)} required style={inputStyle} placeholder="Type your full legal name" />
              </div>
              <div style={{ ...fieldStyle, ...fullWidth }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
                  <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} required />
                  <span>I have read and agree to the <Link to="/legal" target="_blank" rel="noopener noreferrer" style={styles.link}>Privacy Policy</Link></span>
                </label>
              </div>
            </div>
          </section>

          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f0f4f8", padding: "2rem 1rem", display: "flex", justifyContent: "center", alignItems: "flex-start" },
  card: { backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", padding: "2rem", maxWidth: "700px", width: "100%" },
  title: { margin: 0, fontSize: "1.75rem", fontWeight: 600, color: "#1a365d" },
  subtitle: { margin: "0.5rem 0 1.5rem", color: "#64748b" },
  form: { display: "flex", flexDirection: "column", gap: 0 },
  fileInput: { padding: "0.5rem 0" },
  error: { color: "#dc2626", margin: "0 0 1rem" },
  submitBtn: { padding: "1rem 1.5rem", fontSize: "1.1rem", fontWeight: 600, color: "#fff", backgroundColor: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer" },
  link: { color: "#2563eb", textDecoration: "none", fontWeight: 500 },
};
