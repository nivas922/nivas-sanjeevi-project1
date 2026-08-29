import React, { createContext, useContext, useState, useEffect } from "react";
import { storageService } from "../services/storageService";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state from storage
    const savedToken = storageService.getToken();
    if (savedToken) {
      const savedUser = storageService.getUser();
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

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const res = await api.register({ name, email, password });
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
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
        register,
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
