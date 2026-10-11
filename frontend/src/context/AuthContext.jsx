import React, { createContext, useContext, useState, useEffect } from "react";
import { storageService } from "../services/storageService";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storageService.getUser() || storageService.initNewUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let savedUser = storageService.getUser();
    if (!savedUser) {
      savedUser = storageService.initNewUser();
    }
    setUser(savedUser);
  }, []);

  const updateProfile = (updatedData) => {
    const updated = storageService.updateUser(updatedData);
    setUser(updated);
    return updated;
  };

  const logout = () => {
    // Direct access: No session to terminate; resets user preferences
    const resetUser = storageService.initNewUser();
    setUser(resetUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: null,
        isAuthenticated: true,
        loading: false,
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
