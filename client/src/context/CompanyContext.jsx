import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getCompanies } from "../api/companies";
import { isStaff } from "../constants/roles";

const STORAGE_KEY = "ow_selectedCompanyId";
const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const { user, authLoading } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const setSelectedCompanyId = useCallback((id) => {
    setSelectedCompanyIdState(id || null);
    if (isStaff(user?.role)) {
      try {
        if (id) localStorage.setItem(STORAGE_KEY, id);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [user?.role]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCompanies([]);
      setSelectedCompanyIdState(null);
      setLoading(false);
      setError(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
      return;
    }
    if (!isStaff(user?.role)) {
      setCompanies([]);
      setSelectedCompanyIdState(null);
      setLoading(false);
      setError(null);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
      return;
    }

    setLoading(true);
    setError(null);
    getCompanies()
      .then((res) => {
        const list = res?.data ?? [];
        const arr = Array.isArray(list) ? list : [];
        setCompanies(arr);
        if (arr.length > 0) {
          setSelectedCompanyIdState((prev) => {
            const exists = arr.some((c) => c._id === prev);
            const next = exists ? prev : arr[0]._id;
            try {
              if (next) localStorage.setItem(STORAGE_KEY, next);
            } catch { /* ignore */ }
            return next;
          });
        } else {
          setSelectedCompanyIdState(null);
        }
      })
      .catch((err) => {
        setCompanies([]);
        setSelectedCompanyIdState(null);
        setError(err?.response?.data?.message || "Failed to load companies");
        if (import.meta.env.DEV) {
          const requestId = err?.response?.data?.requestId;
          console.warn("[CompanyProvider] Companies fetch failed", requestId ? { requestId } : "", err?.response?.status, err?.message);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authLoading, user]);

  const value = {
    companies,
    loading,
    error,
    selectedCompanyId,
    setSelectedCompanyId,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  return (
    ctx || {
      companies: [],
      loading: false,
      error: null,
      selectedCompanyId: null,
      setSelectedCompanyId: () => {},
    }
  );
}
