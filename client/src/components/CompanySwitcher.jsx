import { useCompany } from "../context/CompanyContext";

export default function CompanySwitcher({ onSelect, className = "" }) {
  const { companies, loading, selectedCompanyId, setSelectedCompanyId } = useCompany();

  const handleChange = (e) => {
    const id = e.target.value || null;
    setSelectedCompanyId(id);
    onSelect?.(id);
  };

  if (loading) {
    return (
      <div className={className} style={{ fontSize: "0.9rem", color: "#94a3b8" }}>
        Loading…
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return null;
  }

  if (companies.length === 1) {
    return (
      <div className={className} style={{ fontSize: "0.9rem", color: "#64748b" }}>
        {companies[0].name}
      </div>
    );
  }

  return (
    <select
      value={selectedCompanyId || ""}
      onChange={handleChange}
      className={className}
      style={{
        padding: "0.4rem 0.75rem",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        fontSize: "0.9rem",
        fontWeight: 500,
      }}
      aria-label="Select company"
    >
      <option value="">Select company…</option>
      {companies.map((c) => (
        <option key={c._id} value={c._id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
