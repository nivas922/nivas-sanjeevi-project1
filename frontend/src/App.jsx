import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { LearningProvider } from "./context/LearningContext";

import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { UploadTextbook } from "./pages/UploadTextbook";
import { MyTextbooks } from "./pages/MyTextbooks";
import { MySummaries } from "./pages/MySummaries";
import { SummaryDetail } from "./pages/SummaryDetail";
import { TextToSpeechPage } from "./pages/TextToSpeechPage";
import { AIQuiz } from "./pages/AIQuiz";
import { QuizResults } from "./pages/QuizResults";
import { ProgressAnalytics } from "./pages/ProgressAnalytics";
import { AIRecommendations } from "./pages/AIRecommendations";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LearningProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected App Layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="textbooks" element={<MyTextbooks />} />
                <Route path="upload" element={<UploadTextbook />} />
                <Route path="summaries" element={<MySummaries />} />
                <Route path="summaries/:id" element={<SummaryDetail />} />
                <Route path="tts" element={<TextToSpeechPage />} />
                <Route path="quiz" element={<AIQuiz />} />
                <Route path="quiz/results" element={<QuizResults />} />
                <Route path="progress" element={<ProgressAnalytics />} />
                <Route path="recommendations" element={<AIRecommendations />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </LearningProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
