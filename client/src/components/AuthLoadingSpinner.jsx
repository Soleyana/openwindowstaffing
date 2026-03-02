export default function AuthLoadingSpinner() {
  return (
    <div className="auth-loading" role="status" aria-label="Loading">
      <div className="auth-loading-spinner" aria-hidden="true" />
      <span className="auth-loading-text">Loading…</span>
    </div>
  );
}
