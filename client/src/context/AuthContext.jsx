import React, { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/auth.service.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await authService.getMe();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const signup = async (data) => {
    setError(null);
    const res = await authService.signup(data);
    return res;
  };

  const verifyEmail = async (data) => {
    setError(null);
    const res = await authService.verifyEmail(data);
    return res;
  };

  const login = async (credentials) => {
    setError(null);
    const res = await authService.login(credentials);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
    }
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
    }
  };

  const forgotPassword = async (data) => {
    setError(null);
    return await authService.forgotPassword(data);
  };

  const resetPassword = async (data) => {
    setError(null);
    return await authService.resetPassword(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signup,
        verifyEmail,
        login,
        logout,
        forgotPassword,
        resetPassword,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
