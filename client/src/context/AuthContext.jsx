import { createContext, useContext, useState, useEffect } from "react";
import { fetchMe, logoutUser } from "../api/auth";
import { setAuthInitialized } from "../lib/authState";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshMe = async () => {
    setAuthLoading(true);
    try {
      const u = await fetchMe();
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
      setAuthInitialized(true);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const value = {
    user,
    authLoading,
    isLoggedIn: !!user,
    login,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
