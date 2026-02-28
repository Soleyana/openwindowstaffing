import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getAllApplications, updateApplicationStatus } from "../api/applicationApi";
import { API_BASE_URL } from "../config";
import StatusBadge from "../components/StatusBadge";

export default function RecruiterDashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = () => {
    if (!user) return;
    getAllApplications()
      .then((res) => setApplications(res.data || []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [user]);

  const handleStatus = async (appId, status) => {
    try {
      await updateApplicationStatus(appId, status);
      setApplications((prev) =>
        prev.map((a) => (a._id === appId ? { ...a, status } : a))
      );
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || "Failed to update status", "error");
    }
  };

  if (loading) {
    return (
      <div className="recruiter-dashboard">
        <h1>Applicants</h1>
        <p>Loading applicants...</p>
      </div>
    );
  }

  return (
    <div className="recruiter-dashboard">
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Applicants</h1>
        <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>Manage your applicants</p>
      </div>

      {applications.length === 0 ? (
        <p>No applications yet</p>
      ) : (
        <div className="recruiter-applications-table-wrap">
          <table className="recruiter-applications-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City/State</th>
                <th>Job Title</th>
                <th>Resume</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app._id}>
                  <td>
                    {[app.firstName, app.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>{app.email || "—"}</td>
                  <td>{app.phone || "—"}</td>
                  <td>
                    {[app.city, app.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td>{app.jobTitle || app.jobId?.title || "—"}</td>
                  <td>
                    {app.resumeUrl ? (
                      <a
                        href={`${API_BASE_URL || ""}/api/applications/${app._id}/resume`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <StatusBadge status={app.status} variant="recruiter" />
                  </td>
                  <td>
                    {(!app.status || app.status === "applied" || app.status === "reviewing" || app.status === "pending" || app.status === "new") && (
                      <>
                        <button
                          type="button"
                          className="btn-accept"
                          onClick={() => handleStatus(app._id, "placed")}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="btn-reject"
                          onClick={() => handleStatus(app._id, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
