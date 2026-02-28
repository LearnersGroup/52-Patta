import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { setAuthToken } from "../../api/apiHandler";

const OAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get("token");
        const user_name = searchParams.get("user_name");
        const error = searchParams.get("error");

        if (error) {
            navigate("/login?error=" + error, { replace: true });
            return;
        }

        if (token && user_name) {
            setAuthToken(token);
            login({ token, user_name });
        } else {
            navigate("/login", { replace: true });
        }
    }, []);

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ textAlign: "center", padding: "60px 40px" }}>
                <div className="auth-logo">
                    <span className="suit suit-heart">♥</span>
                    <h1>52-Patta</h1>
                    <span className="suit suit-spade">♠</span>
                </div>
                <p className="auth-tagline" style={{ marginTop: "24px" }}>
                    Signing you in...
                </p>
            </div>
        </div>
    );
};

export default OAuthCallback;
