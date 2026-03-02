import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { searchCandidates } from "../api/recruiterApplications";
import { useToast } from "../context/ToastContext";

export default function CandidateSearch() {
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    specialty: "",
    licenseState: "",
    expiringSoon: "",
    verifiedStatus: "",
  });

  useEffect(() => {
    loadCandidates();
  }, [filters]);

  async function loadCandidates() {
    try {
      setLoading(true);
      const params = {};
      if (filters.specialty) params.specialty = filters.specialty;
      if (filters.licenseState) params.licenseState = filters.licenseState;
      if (filters.expiringSoon) params.expiringSoon = filters.expiringSoon;
      if (filters.verifiedStatus) params.verifiedStatus = filters.verifiedStatus;
      const res = await searchCandidates(params);
      setCandidates(res.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load candidates", "error");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Candidate Search</h1>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3>Filters</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>Specialty</label>
            <input
              type="text"
              value={filters.specialty}
              onChange={(e) => setFilters((f) => ({ ...f, specialty: e.target.value }))}
              placeholder="e.g. RN, LPN"
              style={{ width: 120 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>License State</label>
            <input
              type="text"
              value={filters.licenseState}
              onChange={(e) => setFilters((f) => ({ ...f, licenseState: e.target.value }))}
              placeholder="e.g. CA"
              style={{ width: 80 }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>
              <input
                type="checkbox"
                checked={filters.expiringSoon === "true"}
                onChange={(e) => setFilters((f) => ({ ...f, expiringSoon: e.target.checked ? "true" : "" }))}
              />
              {" "}Expiring soon (30 days)
            </label>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>Doc Status</label>
            <select
              value={filters.verifiedStatus}
              onChange={(e) => setFilters((f) => ({ ...f, verifiedStatus: e.target.value }))}
              style={{ width: 120 }}
            >
              <option value="">Any</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton-block" style={{ height: 300 }} />
      ) : candidates.length === 0 ? (
        <div className="card">
          <p className="text-muted">No candidates found. Candidates appear here once they apply to your jobs.</p>
        </div>
      ) : (
        <div className="card">
          <table className="table-basic" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Experience</th>
                <th>Specialties</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => {
                const u = c.user || c.userId;
                const p = c.profile || {};
                const userId = u?._id || c.userId;
                const name = u?.name || "—";
                const email = u?.email || "—";
                return (
                  <tr key={userId}>
                    <td>{name}</td>
                    <td>{email}</td>
                    <td>{p.yearsExperience ?? "—"}</td>
                    <td>{(p.specialties || []).join(", ") || "—"}</td>
                    <td>
                      <Link to={`/candidate/${userId}`} className="btn-link">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
