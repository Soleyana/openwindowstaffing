import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import { isStaff, isOwner } from "../constants/roles";
import { getMyJobs, getJobs } from "../api/jobs";
import { getMyApplications, getMyApplicationStats } from "../api/applications";

export default function Dashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isRecruiter = isStaff(user?.role);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        if (isRecruiter) {
          const data = await getMyJobs();
          if (!cancelled) setJobs(data.data || []);
        } else {
          const [appData, jobsData, statsData] = await Promise.all([
            getMyApplications(),
            getJobs(),
            getMyApplicationStats(),
          ]);
          if (!cancelled) {
            setApplications(appData.data || []);
            setAllJobs(jobsData.data || []);
            setStats(statsData);
          }
        }
      } catch {
        if (!cancelled) {
          if (isRecruiter) setJobs([]);
          else {
            setApplications([]);
            setAllJobs([]);
            setStats(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, isRecruiter]);

  if (isRecruiter) {
    const published = jobs.length;
    const expired = 0;
    const pending = 0;
    const metrics = [
      {
        label: "Published Listings",
        value: published,
        color: "purple",
        icon: "check",
      },
      {
        label: "Pending Listings",
        value: pending,
        color: "purple",
        icon: "edit",
      },
      {
        label: "Expired Listings",
        value: expired,
        color: "red",
        icon: "clock",
      },
      { label: "Monthly Views", value: 0, color: "blue", icon: "eye" },
    ];
    const chartData = [
      { month: "Jan", views: 0 },
      { month: "Feb", views: 0 },
      { month: "Mar", views: 0 },
      { month: "Apr", views: 0 },
      { month: "May", views: 0 },
      { month: "Jun", views: 0 },
    ];

    const greeting = (() => {
      const h = new Date().getHours();
      if (h < 12) return "Good morning";
      if (h < 18) return "Good afternoon";
      return "Good evening";
    })();

    return (
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1 className="dashboard-title">
            {greeting}, {user?.name?.split(" ")[0] || "Recruiter"}
          </h1>
          <p className="dashboard-subtitle">
            Here&apos;s your recruitment overview
          </p>
        </div>
        <div className="dashboard-metrics">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={`dashboard-metric dashboard-metric--${m.color}`}
            >
              <span className="dashboard-metric-icon" aria-hidden="true">
                {m.icon === "check" && (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {m.icon === "edit" && (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
                {m.icon === "clock" && (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
                {m.icon === "eye" && (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </span>
              <div className="dashboard-metric-value">
                {loading ? "…" : m.value}
              </div>
              <div className="dashboard-metric-label">{m.label}</div>
            </div>
          ))}
        </div>
        <section className="dashboard-chart-section">
          <h2 className="dashboard-chart-title">Monthly Views</h2>
          <div
            className="dashboard-chart"
            role="img"
            aria-label="Monthly views chart"
          >
            <div className="dashboard-chart-grid">
              <div className="dashboard-chart-content">
                <div className="dashboard-chart-yaxis">
                  <span>20</span>
                  <span>18</span>
                  <span>16</span>
                  <span>14</span>
                  <span>12</span>
                  <span>10</span>
                </div>
                <div className="dashboard-chart-bars">
                  {chartData.map((d) => (
                    <div key={d.month} className="dashboard-chart-bar-wrap">
                      <div
                        className="dashboard-chart-bar"
                        style={{
                          height: `${Math.max(4, (d.views / 20) * 100)}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="dashboard-chart-labels">
              {chartData.map((d) => (
                <span key={d.month} className="dashboard-chart-label">
                  {d.month}
                </span>
              ))}
            </div>
          </div>
        </section>
        <div className="dashboard-actions">
          <Link to="/post-job" className="dashboard-cta">
            + Post new job
          </Link>
          {isOwner(user) && (
            <Link
              to="/invite-recruiter"
              className="dashboard-cta dashboard-cta--outline"
            >
              Invite Recruiter
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Candidate dashboard
  const appliedJobIds = applications
    .map((a) => a.job?._id || a.job)
    .filter(Boolean);
  const recommendedJobs = allJobs
    .filter((j) => !appliedJobIds.includes(j._id))
    .slice(0, 4);
  const recentApplications = [...applications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const candidateMetrics = [
    {
      label: "My Applications",
      value: stats?.totalApplications ?? (loading ? "…" : 0),
      color: "blue",
      icon: "check",
    },
    {
      label: "Under Review",
      value: stats?.underReview ?? (loading ? "…" : 0),
      color: "yellow",
      icon: "clock",
    },
    {
      label: "Offer",
      value: stats?.offer ?? (loading ? "…" : 0),
      color: "purple",
      icon: "edit",
    },
    {
      label: "Placed",
      value: stats?.placed ?? (loading ? "…" : 0),
      color: "green",
      icon: "check",
    },
    {
      label: "Not Selected",
      value: stats?.notSelected ?? (loading ? "…" : 0),
      color: "red",
      icon: "eye",
    },
  ];

  const MetricIcon = ({ icon }) => {
    if (icon === "check")
      return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    if (icon === "clock")
      return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    if (icon === "edit")
      return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    if (icon === "eye")
      return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    return null;
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1 className="dashboard-title">
          {greeting}, {user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="dashboard-subtitle">Your healthcare career hub</p>
      </div>
      <div className="dashboard-metrics">
        {candidateMetrics.map((m) => (
          <div
            key={m.label}
            className={`dashboard-metric dashboard-metric--${m.color}`}
          >
            <span className="dashboard-metric-icon" aria-hidden="true">
              <MetricIcon icon={m.icon} />
            </span>
            <div className="dashboard-metric-value">
              {loading ? "…" : m.value}
            </div>
            <div className="dashboard-metric-label">{m.label}</div>
          </div>
        ))}
      </div>

      <section className="dashboard-card-section">
        <h2 className="dashboard-card-title">Recent Applications</h2>
        {loading ? (
          <p className="dashboard-placeholder">Loading…</p>
        ) : recentApplications.length === 0 ? (
          <p className="dashboard-placeholder">
            You haven&apos;t applied to any jobs yet.{" "}
            <Link to="/jobs">Browse jobs</Link> to get started.
          </p>
        ) : (
          <ul className="dashboard-app-list">
            {recentApplications.map((app) => (
              <li key={app._id} className="dashboard-app-item">
                <div className="dashboard-app-item-row">
                  {app.job?._id ? (
                    <Link
                      to={`/jobs/${app.job._id}`}
                      className="dashboard-app-link"
                    >
                      {app.job.title}
                    </Link>
                  ) : (
                    <span
                      className="dashboard-app-link"
                      style={{
                        color: "#64748b",
                        fontStyle: "italic",
                        cursor: "default",
                      }}
                    >
                      Job no longer available
                    </span>
                  )}
                  <StatusBadge status={app.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-card-section">
        <h2 className="dashboard-card-title">Recommended for You</h2>
        {loading ? (
          <p className="dashboard-placeholder">Loading…</p>
        ) : recommendedJobs.length === 0 ? (
          <p className="dashboard-placeholder">
            No new job recommendations. <Link to="/jobs">Browse all jobs</Link>.
          </p>
        ) : (
          <ul className="dashboard-job-list">
            {recommendedJobs.map((job) => (
              <li key={job._id} className="dashboard-job-item">
                <Link to={`/jobs/${job._id}`} className="dashboard-job-link">
                  {job.title}
                </Link>
                <span className="dashboard-job-meta">
                  {job.company} • {job.location}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="dashboard-actions">
        <Link to="/jobs" className="dashboard-cta">
          Browse Jobs
        </Link>
        <Link
          to="/my-applications"
          className="dashboard-cta dashboard-cta--outline"
        >
          View my applications
        </Link>
      </div>
    </div>
  );
}
