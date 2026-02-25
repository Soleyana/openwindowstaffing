import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import JobCard from "../components/JobCard";
import { getJobs } from "../api/jobs";

export default function Jobs() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keywords, setKeywords] = useState(searchParams.get("keywords") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");

  useEffect(() => {
    setKeywords(searchParams.get("keywords") || "");
    setLocation(searchParams.get("location") || "");
    setCategory(searchParams.get("category") || "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      try {
        setLoading(true);
        setError(null);
        const json = await getJobs();

        if (cancelled) return;

        if (json?.success && json.data) {
          setJobs(json.data);
        } else {
          setJobs([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err.message || "Failed to load jobs");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="jobs-page">
      <nav className="jobs-nav">
        <Link to="/">← Home</Link>
      </nav>
      <h1 className="jobs-title">Healthcare Job Openings</h1>

      <div className="jobs-search-card">
        <form
          className="jobs-search-form"
          onSubmit={(e) => {
            e.preventDefault();
            const params = new URLSearchParams();
            if (keywords) params.set("keywords", keywords);
            if (location) params.set("location", location);
            if (category) params.set("category", category);
            window.history.replaceState({}, "", `/jobs?${params.toString()}`);
          }}
        >
          <div className="jobs-search-row">
            <div className="jobs-search-field-wrap">
              <label className="jobs-search-label" htmlFor="jobs-keywords">Keywords</label>
              <input
                id="jobs-keywords"
                type="text"
                className="jobs-search-field"
                placeholder="Keywords (e.g. RN, Therapist)"
                aria-label="Keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
            <div className="jobs-search-field-wrap">
              <label className="jobs-search-label" htmlFor="jobs-location">Location</label>
              <input
                id="jobs-location"
                type="text"
                className="jobs-search-field"
                placeholder="Location"
                aria-label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        <div className="jobs-search-row">
          <div className="jobs-search-field-wrap">
            <label className="jobs-search-label" htmlFor="jobs-category">Healthcare Category</label>
            <select
              id="jobs-category"
              className="jobs-search-field"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                const params = new URLSearchParams();
                if (keywords) params.set("keywords", keywords);
                if (location) params.set("location", location);
                if (e.target.value) params.set("category", e.target.value);
                window.history.replaceState({}, "", `/jobs?${params.toString()}`);
              }}
              aria-label="Healthcare category"
            >
              <option value="">All healthcare jobs</option>
              <option value="RN">Registered Nurses</option>
              <option value="CNA">CNAs</option>
              <option value="LPN">LPNs</option>
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
        </div>
        <div className="jobs-search-options">
          <label className="jobs-search-check-wrap">
            <input type="checkbox" className="jobs-search-check" readOnly aria-label="Remote only" />
            <span>Remote positions only</span>
          </label>
          <button
            type="button"
            className="jobs-search-advanced-btn"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "Basic Search" : "Advanced Search"}
          </button>
        </div>
        {showAdvanced && (
          <div className="jobs-search-advanced-fields">
            <div className="jobs-search-row">
              <div className="jobs-search-field-wrap">
                <label className="jobs-search-label" htmlFor="jobs-salary-min">Minimum Salary</label>
                <input
                  id="jobs-salary-min"
                  type="text"
                  className="jobs-search-field"
                  placeholder="Search Salary Min"
                  readOnly
                  aria-label="Minimum salary"
                />
              </div>
              <div className="jobs-search-field-wrap">
                <label className="jobs-search-label" htmlFor="jobs-salary-max">Maximum Salary</label>
                <input
                  id="jobs-salary-max"
                  type="text"
                  className="jobs-search-field"
                  placeholder="Search Salary Max"
                  readOnly
                  aria-label="Maximum salary"
                />
              </div>
            </div>
            <div className="jobs-search-row">
              <div className="jobs-search-field-wrap">
                <label className="jobs-search-label" htmlFor="jobs-rate-min">Minimum Rate</label>
                <input
                  id="jobs-rate-min"
                  type="text"
                  className="jobs-search-field"
                  placeholder="Search Rate Min"
                  readOnly
                  aria-label="Minimum rate"
                />
              </div>
              <div className="jobs-search-field-wrap">
                <label className="jobs-search-label" htmlFor="jobs-rate-max">Maximum Rate</label>
                <input
                  id="jobs-rate-max"
                  type="text"
                  className="jobs-search-field"
                  placeholder="Search Rate Max"
                  readOnly
                  aria-label="Maximum rate"
                />
              </div>
            </div>
          </div>
        )}
        <div className="jobs-search-types">
          <label className="jobs-search-type-item">
            <input type="checkbox" className="jobs-search-type-check" defaultChecked readOnly aria-label="Full Time" />
            <span>Full Time</span>
          </label>
          <label className="jobs-search-type-item">
            <input type="checkbox" className="jobs-search-type-check" defaultChecked readOnly aria-label="Part Time" />
            <span>Part Time</span>
          </label>
          <label className="jobs-search-type-item">
            <input type="checkbox" className="jobs-search-type-check" defaultChecked readOnly aria-label="Contract" />
            <span>Contract</span>
          </label>
          <label className="jobs-search-type-item">
            <input type="checkbox" className="jobs-search-type-check" defaultChecked readOnly aria-label="Travel" />
            <span>Travel</span>
          </label>
        </div>
        </form>
      </div>

      {loading && <p className="jobs-loading">Loading jobs…</p>}
      {error && <p className="jobs-error">{error}</p>}

      {!loading && !error && jobs.length === 0 && (
        <p className="jobs-empty">No jobs posted yet.</p>
      )}

      {!loading && !error && jobs.length > 0 && (() => {
        const filtered = jobs.filter((job) => {
              const kw = (keywords || "").toLowerCase();
              const loc = (location || "").toLowerCase();
              if (category && job.category !== category) return false;
              if (kw && !(job.title?.toLowerCase().includes(kw) || job.description?.toLowerCase().includes(kw) || job.company?.toLowerCase().includes(kw) || job.location?.toLowerCase().includes(kw))) return false;
              if (loc && !job.location?.toLowerCase().includes(loc)) return false;
              return true;
            });
        return filtered.length === 0 ? (
          <p className="jobs-empty">No jobs match your search. Try different keywords or <Link to="/jobs">clear filters</Link>.</p>
        ) : (
          <div className="jobs-list">
            {filtered.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
