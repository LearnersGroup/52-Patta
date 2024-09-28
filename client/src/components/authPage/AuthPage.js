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
        <div>
            <form onSubmit={handleLogin}>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <button type="submit">Login</button>
                {errors.length !== 0 &&
                    errors.map((err) => <div key={err.path}>{err.msg}</div>)}
                <div>
                    <p>Do not have a account?</p>
                    <button onClick={() => navigate("/register")}>
                        create a account
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AuthPage;
