import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isStaff } from "../constants/roles";

export default function RedirectToDashboard({ children }) {
  const { isLoggedIn, user } = useAuth();

  if (isLoggedIn) {
    return <Navigate to={isStaff(user?.role) ? "/recruiter/dashboard" : "/dashboard"} replace />;
  }

  return children;
}
