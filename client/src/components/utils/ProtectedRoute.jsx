import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { setAuthToken } from "../../api/apiHandler";

export const ProtectedRoute = (props) => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/login" />;
    }
    setAuthToken(user.token);
    return props.children;
};
