import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { user_login, user_register } from "../../api/apiHandler";
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
                    <label htmlFor="useremail">User email:</label>
                    <input
                        id="useremail"
                        type="text"
                        value={useremail}
                        onChange={(e) => setUseremail(e.target.value)}
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
                <button type="submit">Register</button>
                {errors.length !== 0 &&
                    errors.map((err) => <div key={err.path}>{err.msg}</div>)}
                <div>
                    <p>Already registered?</p>
                    <button onClick={() => navigate('/login')}>go to login</button>
                </div>
                
            </form>
        </div>
    );
};

export default RegisterPage;
