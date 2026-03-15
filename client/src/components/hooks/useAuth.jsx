// src/hooks/useAuth.jsx

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStorage } from "./useLocalStorage";
import { socket } from "../../socket";
import apiClient from "../../api/apiClient";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useLocalStorage("user", null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  const refreshProfile = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth');
      setProfile(res.data);
    } catch {
      setProfile(null);
    }
  }, []);

  // call this function when you want to authenticate the user
  const login = async (data) => {
    setUser(data);
    setProfile(null);
    socket.connect();
    navigate("/");
  };

  // call this function to sign out logged in user
  const logout = () => {
    setUser(null);
    setProfile(null);
    socket.disconnect();
    navigate("/login", { replace: true });
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      login,
      logout,
      refreshProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, profile, refreshProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};