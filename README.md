# LearnAI: AI-Powered Multilingual Textbook Summarization and Adaptive Learning System

An intelligent educational platform that ingests academic textbooks, extracts structured curriculum, synthesizes concepts, translates learning material into Indian languages, offers Text-to-Speech audio study, and dynamically adapts quizzes and recommendations based on student performance.

---

## 📁 Project Structure

```
learnai-platform/
├── frontend/                     # React + Vite + Tailwind CSS + Lucide Icons + Web Speech API
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Button, Modal, StatCard, Badge, ProgressBar, EmptyState
│   │   │   ├── layout/           # Sidebar, Navbar, AppLayout
│   │   │   ├── tts/              # Reusable TextToSpeech player with multi-language voice detection
│   │   │   ├── summary/          # KeyPoints, DefinitionsCard, FormulasCard, ExamplesCard, SimplifyModal, TranslationModal
│   │   │   ├── quiz/             # QuizCard, QuizProgress
│   │   │   └── adaptive/         # RecommendationCard, TopicMasteryCard
│   │   ├── context/              # AuthContext, ToastContext, LearningContext
│   │   ├── data/                 # Realistic seed data for Python, DBMS, OS, Computer Networks
│   │   ├── pages/                # Dashboard, UploadTextbook, MyTextbooks, MySummaries, SummaryDetail, TextToSpeechPage, AIQuiz, QuizResults, ProgressAnalytics, AIRecommendations, Settings, Login, Register, ForgotPassword
│   │   ├── services/             # api.js, storageService.js, speechService.js, exportService.js
│   │   └── App.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── backend/                      # Python Flask/FastAPI REST API (Phases 2+)
```

---

## 🚀 Getting Started (Phase 1 Frontend)

### 1. Run the Frontend Development Server
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\learnai-platform\frontend
npm run dev
```

### 2. Access the Application
Open your browser at `http://localhost:5173` (or the port indicated in your console).

- **1-Click Login**: On the login screen, click **"1-Click Sign In"** to instantly test the platform as student **Alex Johnson**.
- **Upload Textbook**: Test drag-and-drop file ingestion and watch the live 8-stage progress tracker.
- **Multilingual Summaries**: Switch between English, Tamil, Hindi, Telugu, Kannada, Malayalam, and Bengali.
- **Audio Learning**: Click **Listen** to experience browser Web Speech API with adjustable speech speeds (0.5x to 2x).
- **Adaptive Quiz**: Take the Computer Networks or Python quiz and observe how the Adaptive Learning Engine diagnoses your strong vs weak topics and tailors recommendations.
