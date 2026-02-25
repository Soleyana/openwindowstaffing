import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { createJob, getMyJobs } from "../api/jobs";

export default function JobPostForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [companyType, setCompanyType] = useState("new");
  const [existingCompanies, setExistingCompanies] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("full-time");
  const [category, setCategory] = useState("nursing");
  const [company, setCompany] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyContactPhone, setCompanyContactPhone] = useState("");
  const [payRate, setPayRate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const draft = localStorage.getItem("openwindow_job_draft");
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.location) setLocation(d.location);
        if (d.jobType) setJobType(d.jobType);
        if (d.category) setCategory(d.category);
        if (d.company) setCompany(d.company);
        if (d.companyWebsite) setCompanyWebsite(d.companyWebsite);
        if (d.companyEmail) setCompanyEmail(d.companyEmail);
        if (d.companyContactPhone) setCompanyContactPhone(d.companyContactPhone);
        if (d.payRate) setPayRate(d.payRate);
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await getMyJobs();
        const jobs = data.data || [];
        const names = [...new Set(jobs.map((j) => j.company).filter(Boolean))];
        if (!cancelled) setExistingCompanies(names);
      } catch {
        if (!cancelled) setExistingCompanies([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const handleExistingSelect = (e) => {
    const val = e.target.value;
    setCompany(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createJob({
        title,
        description,
        location,
        jobType,
        category,
        company: company || undefined,
        companyWebsite: companyWebsite || undefined,
        companyEmail: companyEmail || undefined,
        companyContactPhone: companyContactPhone || undefined,
        payRate: payRate || undefined,
      });
      localStorage.removeItem("openwindow_job_draft");
      navigate("/jobs");
    } catch (err) {
      setError(err.message || "Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="job-post-form">
      {error && <p className="job-post-error">{error}</p>}

      <div className="job-post-field">
        <label htmlFor="job-title">Job title *</label>
        <input
          id="job-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Registered Nurse, Physical Therapist, Medical Technologist"
        />
      </div>
      <div className="job-post-field">
        <label htmlFor="job-category">Healthcare Category *</label>
        <select
          id="job-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="nursing">Nursing</option>
          <option value="allied-health">Allied Health</option>
          <option value="therapy">Therapy</option>
          <option value="travel-nursing">Travel Nursing</option>
          <option value="administrative">Administrative</option>
          <option value="physician-provider">Physician & Provider</option>
          <option value="behavioral-health">Behavioral Health</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="diagnostic-imaging">Diagnostic & Imaging</option>
          <option value="home-health">Home Health</option>
          <option value="leadership">Leadership & Management</option>
          <option value="administrative">Administrative</option>
          <option value="other-healthcare">Other Healthcare</option>
        </select>
      </div>
      <div className="job-post-field">
        <label htmlFor="job-description">Description *</label>
        <textarea
          id="job-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          placeholder="Describe the role and requirements..."
        />
      </div>
      <div className="job-post-field">
        <label htmlFor="job-location">Location *</label>
        <input
          id="job-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          placeholder="e.g. Houston, TX"
        />
      </div>
      <div className="job-post-field">
        <label htmlFor="job-type">Job type *</label>
        <select
          id="job-type"
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          required
        >
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="travel">Travel</option>
        </select>
      </div>
      <div className="job-post-field">
        <label htmlFor="job-pay">Pay rate</label>
        <input
          id="job-pay"
          type="text"
          value={payRate}
          onChange={(e) => setPayRate(e.target.value)}
          placeholder="e.g. $45/hr"
        />
      </div>

      <section className="company-details-section">
        <h3 className="company-details-header">Company Details</h3>
        <div className="company-type-cards">
          <button
            type="button"
            className={`company-type-card ${companyType === "new" ? "company-type-card--active" : ""}`}
            onClick={() => {
              setCompanyType("new");
              setCompany("");
            }}
          >
            <span className="company-type-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            <span>New Company</span>
          </button>
          <button
            type="button"
            className={`company-type-card ${companyType === "existing" ? "company-type-card--active" : ""}`}
            onClick={() => setCompanyType("existing")}
          >
            <span className="company-type-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <path d="M9 22v-4h6v4" />
              </svg>
            </span>
            <span>Existing Company</span>
          </button>
        </div>

        <div className="company-details-fields">
          {companyType === "existing" && existingCompanies.length > 0 && (
            <div className="job-post-field">
              <label htmlFor="company-select">Company *</label>
              <select
                id="company-select"
                value={company}
                onChange={handleExistingSelect}
                required
              >
                <option value="">Select a company</option>
                {existingCompanies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}
          {companyType === "existing" && existingCompanies.length === 0 && (
            <>
              <div className="company-details-divider" />
              <p className="company-details-no-companies">
                You either have not logged in or you don&apos;t have any companies with this account.
              </p>
            </>
          )}
          {companyType === "new" && (
            <>
              <div className="company-details-row">
                <div className="job-post-field">
                  <label htmlFor="company-name">Company Name *</label>
                  <input
                    id="company-name"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    placeholder="The full Company name"
                  />
                </div>
                <div className="job-post-field">
                  <label htmlFor="company-website">Company Website (Optional)</label>
                  <input
                    id="company-website"
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://domain.com"
                  />
                </div>
              </div>
              <div className="company-details-row">
                <div className="job-post-field">
                  <label htmlFor="company-email">Company Email (Optional)</label>
                  <input
                    id="company-email"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="job-post-field">
                  <label htmlFor="company-phone">Company Contact Phone (Optional)</label>
                  <input
                    id="company-phone"
                    type="tel"
                    value={companyContactPhone}
                    onChange={(e) => setCompanyContactPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <div className="job-post-form-footer">
        <button
          type="button"
          className="job-post-draft-btn"
          onClick={() => {
            const draft = { title, description, location, jobType, category, company, companyWebsite, companyEmail, companyContactPhone, payRate };
            localStorage.setItem("openwindow_job_draft", JSON.stringify(draft));
            toast.show("Draft saved. You can continue editing later.");
          }}
        >
          Save Draft
        </button>
        <div className="job-post-step-indicator">
          <span className="job-post-step">
            <span className="job-post-step-num job-post-step-num--active">1</span>
            <span className="job-post-step-label job-post-step-label--active">Listing Details</span>
          </span>
          <span className="job-post-step-connector" aria-hidden="true" />
          <span className="job-post-step">
            <span className="job-post-step-num job-post-step-num--next">2</span>
            <span className="job-post-step-label">Preview Listing</span>
          </span>
        </div>
        <div className="job-post-actions">
          <button type="submit" className="job-post-preview-btn" disabled={loading}>
            {loading ? "Posting…" : "Preview Listing"}
          </button>
        </div>
      </div>
    </form>
  );
}
