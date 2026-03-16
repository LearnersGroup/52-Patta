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
        const needsOnboarding = searchParams.get("needs_onboarding") === '1';
        const error = searchParams.get("error");
        const existingProvider = searchParams.get("existing_provider");

        if (error) {
            navigate(`/login?error=${error}${existingProvider ? `&existing_provider=${existingProvider}` : ''}`, { replace: true });
            return;
        }

        if (token && user_name) {
            setAuthToken(token);
            login({ token, user_name, needs_onboarding: needsOnboarding });
        } else {
            navigate("/login", { replace: true });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
