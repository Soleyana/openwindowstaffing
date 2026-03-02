import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../constants/roles";
import AuthLoadingSpinner from "./AuthLoadingSpinner";
import { REDIRECT_KEY, setLastProtectedRoute } from "../lib/authRedirect";

export default function ProtectedRoute({ children, role, roles }) {
  const location = useLocation();
  const { user, authLoading } = useAuth();

  if (authLoading) return <AuthLoadingSpinner />;
  if (!user) {
    const from = `${location.pathname}${location.search}`;
    try {
      sessionStorage.setItem(REDIRECT_KEY, from);
    } catch {
      /* ignore */
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowedRoles = roles || (role ? [role] : []);
  if (allowedRoles.length > 0) {
    const hasAccess = allowedRoles.includes(user.role);
    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  setLastProtectedRoute(`${location.pathname}${location.search}`);
  return children;
}
