import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../constants/roles";
import { useToast } from "../context/ToastContext";
import { getJobById, updateJob } from "../api/jobs";
import JobPostForm from "../components/JobPostForm";

export default function JobEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { show: showToast } = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || !isLoggedIn || !isStaff(user?.role)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const data = await getJobById(id);
        if (!cancelled) setJob(data.data);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.status === 403 ? "You don't have permission to edit this job." : err.response?.data?.message || err.message || "Failed to load job");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, isLoggedIn, user?.role]);

  const handleSuccess = (updatedJob) => {
    showToast("Job updated successfully", "success");
    navigate(`/jobs/${updatedJob._id}`);
  };

  if (!isLoggedIn) {
    return (
      <div className="jobs-page">
        <p>Please <Link to="/login">sign in</Link> to edit jobs.</p>
      </div>
    );
  }

  if (!isStaff(user?.role)) {
    return (
      <div className="jobs-page">
        <p>Only recruiters and owners can edit jobs.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="jobs-page"><p className="jobs-loading">Loading…</p></div>;
  }

  if (error || !job) {
    return (
      <div className="jobs-page">
        <p className="jobs-error">{error || "Job not found."}</p>
        <Link to="/jobs">← Back to jobs</Link>
      </div>
    );
  }

  return (
    <div className="post-job-page">
      <h1 className="post-job-title">Edit Job</h1>
      <nav className="post-job-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        <span className="post-job-breadcrumb-sep" aria-hidden="true">{" > "}</span>
        <Link to={`/jobs/${job._id}`}>{job.title}</Link>
        <span className="post-job-breadcrumb-sep" aria-hidden="true">{" > "}</span>
        <span>Edit</span>
      </nav>
      <div className="post-job-form-wrap">
        <JobPostForm editJob={job} onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
