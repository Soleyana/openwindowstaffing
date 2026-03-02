import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, type = "success") => {
    setToast({ message, type });
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, []);

  const hide = useCallback(() => setToast(null), []);

  useEffect(() => {
    const handler = (e) => {
      show(e.detail?.message || "Something went wrong", "error");
    };
    window.addEventListener("api-error", handler);
    return () => window.removeEventListener("api-error", handler);
  }, [show]);

  return (
    <ToastContext.Provider value={{ toast, show, hide }}>
      {children}
      {toast && (
        <div
          role="alert"
          className={`toast toast--${toast.type}`}
          aria-live="polite"
        >
          {toast.message}
          <button
            type="button"
            onClick={hide}
            className="toast__dismiss"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: null, show: () => {}, hide: () => {} };
  return ctx;
}
