import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyJobs } from "../api/jobs";
import { getAllApplications } from "../api/applicationApi";

export default function ListingReports() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyJobs(), getAllApplications()])
      .then(([jobsRes, appsRes]) => {
        if (cancelled) return;
        setJobs(jobsRes.data || []);
        setApplications(appsRes?.data || []);
      })
      .catch(() => {
        if (!cancelled) {
          setJobs([]);
          setApplications([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  const appsByJob = {};
  for (const app of applications) {
    const jobId = app.jobId?._id || app.jobId;
    if (jobId) {
      appsByJob[jobId] = (appsByJob[jobId] || 0) + 1;
    }
  }

  const totalApps = applications.length;
  const totalJobs = jobs.length;

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">Listing Reports</h1>
      <p className="dashboard-subtitle" style={{ margin: "0.25rem 0 1.5rem", color: "#64748b" }}>
        Performance overview of your job listings
      </p>

      {loading && <p className="dashboard-placeholder">Loading…</p>}
      {!loading && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ padding: "1.25rem", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
              <div style={{ fontSize: "0.9rem", color: "#0369a1", marginBottom: "0.25rem" }}>Total Listings</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totalJobs}</div>
            </div>
            <div style={{ padding: "1.25rem", background: "#ecfdf5", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
              <div style={{ fontSize: "0.9rem", color: "#047857", marginBottom: "0.25rem" }}>Total Applications</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totalApps}</div>
            </div>
            <div style={{ padding: "1.25rem", background: "#faf5ff", borderRadius: "8px", border: "1px solid #e9d5ff" }}>
              <div style={{ fontSize: "0.9rem", color: "#7c3aed", marginBottom: "0.25rem" }}>Avg per Listing</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{totalJobs > 0 ? (totalApps / totalJobs).toFixed(1) : "0"}</div>
            </div>
          </div>

          {jobs.length === 0 ? (
            <p className="dashboard-placeholder">
              No job listings yet. <Link to="/post-job">Post a job</Link> to see reports.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Job Title</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Company</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Applications</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job._id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.75rem 1rem" }}>{job.title}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{job.company}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{appsByJob[job._id] || 0}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <Link to="/applicant-pipeline" style={{ color: "var(--primary)", textDecoration: "none" }}>
                          View applicants
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
