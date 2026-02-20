// src/hooks/useAuth.jsx

import { createContext, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "./useLocalStorage";
import { socket } from "../../socket";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage("user", null);
  const navigate = useNavigate();
  // call this function when you want to authenticate the user
  const login = async (data) => {
    setUser(data);
    socket.connect();
    navigate("/");
  };

  // call this function to sign out logged in user
  const logout = () => {
    setUser(null);
    socket.disconnect();
    navigate("/login", { replace: true });
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
    }),
    [user]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};