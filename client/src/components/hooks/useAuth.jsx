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

    if (data?.needs_onboarding) {
      navigate("/create-user", { replace: true });
      return;
    }

    navigate("/");
  };

  const updateUserName = useCallback((name) => {
    if (!name) return;
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        user_name: name,
      };
    });
  }, [setUser]);

  const completeOnboarding = useCallback((name) => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        user_name: name || prev.user_name,
        needs_onboarding: false,
      };
    });
  }, [setUser]);

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
      updateUserName,
      completeOnboarding,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, profile, refreshProfile, updateUserName, completeOnboarding]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};