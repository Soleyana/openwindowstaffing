import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { unsubscribeNewsletter } from "../api/newsletter";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    unsubscribeNewsletter(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="unsubscribe-page">
      <h1>Newsletter Unsubscribe</h1>
      {status === "loading" && <p>Unsubscribing…</p>}
      {status === "success" && (
        <p className="unsubscribe-success">You&apos;ve been unsubscribed successfully. You won&apos;t receive further emails.</p>
      )}
      {status === "error" && (
        <p className="unsubscribe-error">Invalid or expired link. If you need help, please contact us.</p>
      )}
      <p><Link to="/">Return to home</Link></p>
    </div>
  );
}
