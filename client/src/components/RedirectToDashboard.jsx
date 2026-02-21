import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RedirectToDashboard({ children }) {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
