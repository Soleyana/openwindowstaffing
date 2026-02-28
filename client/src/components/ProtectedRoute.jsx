import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../constants/roles";

export default function ProtectedRoute({ children, role, roles }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const allowedRoles = roles || (role ? [role] : []);
  if (allowedRoles.length > 0) {
    const hasAccess = allowedRoles.includes(user.role);
    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
