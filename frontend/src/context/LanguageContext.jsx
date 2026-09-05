import React, { createContext, useContext, useState, useEffect } from "react";
import { SUPPORTED_LANGUAGES } from "../utils/constants";
import { storageService } from "../services/storageService";

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [preferredLanguage, setPreferredLanguage] = useState("en");

  useEffect(() => {
    const user = storageService.getUser();
    if (user?.preferred_language) {
      setPreferredLanguage(user.preferred_language);
    } else if (user?.preferredLanguage) {
      setPreferredLanguage(user.preferredLanguage);
    }
  }, []);

  const changeLanguage = (langCode) => {
    setPreferredLanguage(langCode);
    const user = storageService.getUser();
    if (user) {
      storageService.updateUser({ preferred_language: langCode, preferredLanguage: langCode });
    }
  };

  const currentLanguageObject = SUPPORTED_LANGUAGES.find(l => l.code === preferredLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        preferredLanguage,
        language: preferredLanguage,
        currentLanguage: currentLanguageObject,
        changeLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguageContext must be used within a LanguageProvider");
  }
  return context;
};
