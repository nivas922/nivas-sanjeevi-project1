import React, { createContext, useContext, useState, useEffect } from "react";
import { storageService } from "../services/storageService";
import { SUPPORTED_LANGUAGES } from "../data/demoData";

const LearningContext = createContext(null);

export const LearningProvider = ({ children }) => {
  const [textbooks, setTextbooks] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [activeLanguage, setActiveLanguage] = useState("en");
  const [currentBook, setCurrentBook] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);

  const refreshLearningData = () => {
    setTextbooks(storageService.getTextbooks());
    setSummaries(storageService.getSummaries());
    setQuizzes(storageService.getQuizzes());
    setRecommendations(storageService.getRecommendations());
  };

  useEffect(() => {
    refreshLearningData();
  }, []);

  return (
    <LearningContext.Provider
      value={{
        textbooks,
        summaries,
        quizzes,
        recommendations,
        activeLanguage,
        setActiveLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
        currentBook,
        setCurrentBook,
        activeQuiz,
        setActiveQuiz,
        refreshLearningData
      }}
    >
      {children}
    </LearningContext.Provider>
  );
};

export const useLearning = () => {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error("useLearning must be used within a LearningProvider");
  }
  return context;
};
