import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLoadingSpinner from "./AuthLoadingSpinner";

export default function RedirectToDashboard({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) return <AuthLoadingSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}
