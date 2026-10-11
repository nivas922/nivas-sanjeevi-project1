import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
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
import { ClearDoubtsPage } from "./pages/ClearDoubtsPage";
import { AIRecommendations } from "./pages/AIRecommendations";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LearningProvider>
          <BrowserRouter>
            <Routes>
              {/* Main App Layout - Opens directly without login */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="textbooks" element={<MyTextbooks />} />
                <Route path="upload" element={<UploadTextbook />} />
                <Route path="summaries" element={<MySummaries />} />
                <Route path="summaries/:id" element={<SummaryDetail />} />
                <Route path="tts" element={<TextToSpeechPage />} />
                <Route path="quiz" element={<AIQuiz />} />
                <Route path="quiz/results" element={<QuizResults />} />
                <Route path="doubts" element={<ClearDoubtsPage />} />
                <Route path="recommendations" element={<AIRecommendations />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Redirect legacy auth paths to root dashboard */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="/forgot-password" element={<Navigate to="/" replace />} />

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

