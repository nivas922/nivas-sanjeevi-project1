import React, { createContext, useContext, useState, useEffect } from "react";
import { storageService } from "../services/storageService";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = storageService.getToken();
    const savedUser = storageService.getUser();
    if (savedToken && savedUser) {
      setUser(savedUser);
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (idToken, department) => {
    setLoading(true);
    try {
      const res = await api.loginWithGoogle(idToken, department);
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const sendMobileOtp = async (phoneNumber) => {
    return api.sendMobileOtp(phoneNumber);
  };

  const loginWithMobile = async (phoneNumber, otp, department) => {
    setLoading(true);
    try {
      const res = await api.loginWithMobile(phoneNumber, otp, department);
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      return await api.register(userData);
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async (email, otp) => {
    setLoading(true);
    try {
      const res = await api.verifyEmailOtp(email, otp);
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const resendEmailOtp = async (email) => {
    return api.resendEmailOtp(email);
  };

  const logout = () => {
    storageService.removeToken();
    setUser(null);
    setToken(null);
  };

  const updateProfile = (updatedData) => {
    const updated = storageService.updateUser(updatedData);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        loading,
        login,
        loginWithGoogle,
        sendMobileOtp,
        loginWithMobile,
        register,
        verifyEmailOtp,
        resendEmailOtp,
        logout,
        updateProfile
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
