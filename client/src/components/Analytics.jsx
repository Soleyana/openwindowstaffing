/**
 * GA4 analytics. Loads only when VITE_GA_ID is set.
 * Tracks page views and custom events. Respects Do Not Track.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA_ID = import.meta.env.VITE_GA_ID;

function shouldTrack() {
  if (!GA_ID) return false;
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return false;
  return true;
}

export function usePageView() {
  const location = useLocation();
  useEffect(() => {
    if (!shouldTrack() || typeof gtag === "undefined") return;
    gtag("event", "page_view", { page_path: location.pathname + location.search });
  }, [location]);
}

export function trackEvent(action, params = {}) {
  if (!shouldTrack() || typeof gtag === "undefined") return;
  gtag("event", action, params);
}

export default function Analytics() {
  useEffect(() => {
    if (!GA_ID || !shouldTrack()) return;

    window.dataLayer = window.dataLayer || [];
    function gtag(...args) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
