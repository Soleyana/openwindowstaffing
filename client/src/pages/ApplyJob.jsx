import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { submitFullApplication } from "../api/applications";

export default function ApplyJob() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coverLetter, setCoverLetter] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

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
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("coverLetter", coverLetter);
      formData.append("phone", phone);
      formData.append("experience", experience);
      formData.append("licenseType", licenseType);
      formData.append("specialty", specialty);
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      await submitFullApplication(formData);
      toast.show("Application submitted successfully.");
      navigate("/my-applications");
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Application failed.",
      );
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
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Apply for Job</h1>
        <p style={styles.subtitle}>
          Complete your application below. PDF resume required.
        </p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="cover-letter">Cover Letter</label>
            <textarea
              id="cover-letter"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Introduce yourself and highlight relevant experience..."
              rows={5}
              style={styles.textarea}
            />
          </div>
          <div style={styles.field}>
            <label htmlFor="phone">Phone *</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label htmlFor="experience">Years of Experience</label>
            <input
              id="experience"
              type="text"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="e.g. 5 years"
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label htmlFor="license-type">License Type</label>
            <input
              id="license-type"
              type="text"
              value={licenseType}
              onChange={(e) => setLicenseType(e.target.value)}
              placeholder="e.g. RN, PT, MT"
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label htmlFor="specialty">Specialty</label>
            <input
              id="specialty"
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Critical Care, Pediatrics"
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label htmlFor="resume">Resume (PDF) *</label>
            <input
              id="resume"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              required
              style={styles.fileInput}
            />
          </div>
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
  page: {
    minHeight: "100vh",
    backgroundColor: "#f0f4f8",
    padding: "2rem 1rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    padding: "2rem",
    maxWidth: "600px",
    width: "100%",
  },
  title: {
    margin: 0,
    fontSize: "1.75rem",
    fontWeight: 600,
    color: "#1a365d",
  },
  subtitle: {
    margin: "0.5rem 0 1rem",
    color: "#64748b",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  input: {
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
  },
  textarea: {
    width: "100%",
    padding: "1rem",
    fontSize: "1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    minHeight: "120px",
    resize: "vertical",
    boxSizing: "border-box",
  },
  fileInput: {
    padding: "0.5rem 0",
  },
  error: {
    color: "#dc2626",
    margin: 0,
  },
  submitBtn: {
    padding: "1rem 1.5rem",
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 500,
  },
};
