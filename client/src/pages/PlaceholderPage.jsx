export default function PlaceholderPage({ title, message = "Coming soon." }) {
  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">{title}</h1>
      <p className="dashboard-placeholder">{message}</p>
    </div>
  );
}
