import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { user_register } from "../../api/apiHandler";
import { useNavigate } from "react-router-dom";

export const RegisterPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [useremail, setUseremail] = useState("");
    const [errors, setErrors] = useState([]);
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrors([]);
        try {
            const { token } = await user_register(username, useremail, password);
            if (token) {
                await login({ token });
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
                    <span className="suit suit-heart">♥</span>
                    <span className="suit suit-diamond">♦</span>
                    <h1>52-Patta</h1>
                    <span className="suit suit-spade">♠</span>
                    <span className="suit suit-club">♣</span>
                </div>
                <p className="auth-tagline">The Classic Indian Card Game</p>

                <h2 className="auth-title">Create Account</h2>

                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="useremail">Email</label>
                        <input
                            id="useremail"
                            type="email"
                            className="form-input"
                            value={useremail}
                            onChange={(e) => setUseremail(e.target.value)}
                            placeholder="Enter your email"
                            autoComplete="email"
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
                            placeholder="Choose a password"
                            autoComplete="new-password"
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
                        Register
                    </button>

                    <div className="auth-switch">
                        <span>Already have an account?</span>
                        <button
                            type="button"
                            className="btn-link"
                            onClick={() => navigate("/login")}
                        >
                            Sign In
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;
