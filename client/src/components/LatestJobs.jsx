import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";

const API_URL = `${API_BASE_URL}/api/jobs`;

export default function LatestJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      try {
        setLoading(true);
        const res = await fetch(API_URL);
        const json = await res.json();

        if (cancelled) return;

        if (res.ok && json.success && Array.isArray(json.data)) {
          setJobs(json.data.slice(0, 3));
        } else {
          setJobs([]);
        }
      } catch {
        if (!cancelled) setJobs([]);
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
    <section className="latest-jobs">
      <h2 className="latest-jobs-title">Latest Jobs</h2>

      {loading && <p className="latest-jobs-loading">Loading…</p>}

      {!loading && jobs.length === 0 && (
        <p className="latest-jobs-empty">No jobs posted yet.</p>
      )}

      {!loading && jobs.length > 0 && (
        <div className="latest-jobs-list">
          {jobs.map((job) => (
            <Link
              key={job._id}
              to={`/jobs/${job._id}`}
              className="latest-job-card"
            >
              <span className="latest-job-icon" aria-hidden="true">📋</span>
              <h3 className="latest-job-card-title">{job.title}</h3>
              <p className="latest-job-employer">{job.company}</p>
              <hr className="latest-job-divider" />
              <div className="latest-job-details">
                <div>
                  <span className="latest-job-label">Location</span>
                  <span className="latest-job-value">{job.location}</span>
                </div>
                {job.payRate && (
                  <div>
                    <span className="latest-job-label">Salary</span>
                    <span className="latest-job-value">{job.payRate}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
