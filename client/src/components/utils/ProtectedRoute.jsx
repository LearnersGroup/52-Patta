import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { setAuthToken } from "../../api/apiHandler";

export const ProtectedRoute = ({ children }) => {
  const {user} = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  setAuthToken(user.token);
  return children;
};