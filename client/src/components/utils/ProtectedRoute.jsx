import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { setAuthToken } from "../../api/apiHandler";

export const ProtectedRoute = (props) => {
    const location = useLocation();
    const { user, profile } = useAuth();
    if (!user) {
        return <Navigate to="/login" />;
    }

    const needsOnboarding = !!(profile?.needsOnboarding ?? user?.needs_onboarding);
    if (needsOnboarding && location.pathname !== '/create-user') {
        return <Navigate to="/create-user" replace />;
    }

    setAuthToken(user.token);
    return props.children;
};
