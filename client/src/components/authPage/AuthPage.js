import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { setAuthToken, user_login } from "../../api/apiHandler";
import { useNavigate } from "react-router-dom";

export const AuthPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState([]);
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrors([]);
        try {
            const { token, user_name } = await user_login(username, password);

            if (token) {
                await login({ token, user_name });
                setAuthToken(token);
            }
        } catch (error) {
            console.log(error);
            setErrors(error.errors);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <span className="suit suit-spade">♠</span>
                    <span className="suit suit-heart">♥</span>
                    <h1>52-Patta</h1>
                    <span className="suit suit-diamond">♦</span>
                    <span className="suit suit-club">♣</span>
                </div>
                <p className="auth-tagline">The Classic Indian Card Game</p>

                <h2 className="auth-title">Sign In</h2>

                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                        />
                    </div>

                    {errors.length !== 0 && (
                        <div className="form-errors">
                            {errors.map((err) => (
                                <p key={err.path} className="form-error">{err.msg}</p>
                            ))}
                        </div>
                    )}

                    <button type="submit" className="btn-primary btn-full">
                        Login
                    </button>

                    <div className="auth-switch">
                        <span>Don't have an account?</span>
                        <button
                            type="button"
                            className="btn-link"
                            onClick={() => navigate("/register")}
                        >
                            Create Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AuthPage;
