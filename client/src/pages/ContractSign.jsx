import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { getContract, signContract } from "../api/contracts";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";

export default function ContractSign() {
  const { id } = useParams();
  const { show: showToast } = useToast();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    getContract(id)
      .then((d) => { if (!cancelled) setContract(d?.data ?? d); })
      .catch(() => { if (!cancelled) setContract(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  async function handleSign(e) {
    e.preventDefault();
    if (!contract?._id || signing) return;
    if (!signatureName.trim()) {
      showToast("Please type your full legal name", "error");
      return;
    }
    if (!consent) {
      showToast("You must agree to the terms before signing", "error");
      return;
    }
    setSigning(true);
    try {
      await signContract(contract._id, { signatureName: signatureName.trim(), consent: true });
      showToast("Contract signed successfully", "success");
      setContract((c) => (c ? { ...c, status: "signed" } : c));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to sign", "error");
    } finally {
      setSigning(false);
    }
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user?.role !== "applicant") return <Navigate to="/dashboard" replace />;

  const jobTitle = contract?.offerId?.jobId?.title || contract?.offerId?.jobId || "Position";
  const companyName = contract?.companyId?.name || "Company";

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1 className="dashboard-title">Sign Contract</h1>
          <p className="dashboard-subtitle">
            {contract ? `${jobTitle} – ${companyName}` : "Loading…"}
          </p>
        </div>

        {loading ? (
          <div className="skeleton-block" style={{ height: 300 }} />
        ) : !contract ? (
          <div className="card" style={{ textAlign: "center", color: "#64748b" }}>
            Contract not found or you don't have access.
          </div>
        ) : contract.status === "signed" ? (
          <div className="card">
            <div style={{ color: "#16a34a", fontWeight: 600, marginBottom: "1rem" }}>
              ✓ Contract signed
            </div>
            <p className="text-muted">
              Signed by {contract.signatureName} on{" "}
              {contract.signedAt ? new Date(contract.signedAt).toLocaleString() : "—"}
            </p>
          </div>
        ) : contract.status !== "sent" ? (
          <div className="card" style={{ color: "#64748b" }}>
            This contract is not yet available for signing.
          </div>
        ) : (
          <div className="card">
            <h3 style={{ marginBottom: "1rem" }}>Contract Preview</h3>
            <div
              className="contract-preview"
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "1.5rem",
                maxHeight: 320,
                overflowY: "auto",
                marginBottom: "1.5rem",
                backgroundColor: "#f8fafc",
              }}
              dangerouslySetInnerHTML={{ __html: contract.contractHtml || "" }}
            />
            <form onSubmit={handleSign}>
              <div className="form-row" style={{ marginBottom: "1rem" }}>
                <label htmlFor="signature-name">Type your full legal name</label>
                <input
                  id="signature-name"
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  disabled={signing}
                />
              </div>
              <div className="form-row" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                <input
                  id="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={signing}
                />
                <label htmlFor="consent" style={{ margin: 0, cursor: "pointer" }}>
                  I have read and agree to the terms of this placement agreement.
                </label>
              </div>
              <button type="submit" className="btn-primary" disabled={signing}>
                {signing ? "Signing…" : "Sign Contract"}
              </button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
