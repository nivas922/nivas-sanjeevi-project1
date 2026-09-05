# LearnAI Backend

Robust, secure Node.js & Express REST API backend powering the **AI-Based Multilingual Textbook Summarization and Adaptive Learning System**.

## 🚀 Features

- **Authentication Module**:
  - `POST /auth/google` (and `/api/auth/google`) - Google OAuth signup/login with JWT issuance.
  - `POST /auth/mobile/send-otp` (and `/api/auth/mobile/send-otp`) - Dispatches 6-digit OTP with 5-minute expiry.
  - `POST /auth/mobile/verify-otp` (and `/api/auth/mobile/verify-otp`) - Verifies OTP and issues consistent JWT.
  - **Zero-State Account Initialization**: Guarantees new accounts start with exactly 0 books, 0 summaries, 0 quizzes, 0 average score, and an empty activity log.
- **Relational / Document Database**:
  - Out-of-the-box SQLite database (`./data/learnai.db`) requiring zero external setup or credentials.
  - Full configuration support for MySQL and PostgreSQL via `.env`.
  - Schema: `Users`, `Books`, `Summaries`, `Quizzes`, `Progress`, `ActivityLog`.
- **Textbook Ingestion Pipeline**:
  - `POST /upload-book` - Accepts PDF, DOC, DOCX, TXT, and scanned images (up to 50MB) with MIME and size validation.
- **Dynamic Multilingual AI Summarization**:
  - `POST /summarize` - Ingests textbooks, generates structured academic summaries (Definitions, Formulas, Key Concepts, Code Examples). Dynamically respects user's `preferred_language` (Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, English).
- **Universal Text-to-Speech (TTS)**:
  - `POST /text-to-speech` - Synthesizes audio using corresponding Indian language voice models (`ta-IN`, `hi-IN`, `te-IN`, `kn-IN`, `ml-IN`, `bn-IN`, `en-US`).
- **Adaptive Quiz & Scoring Engine**:
  - `POST /generate-quiz` - Generates customizable question banks (5, 10, 15, 20 questions) in student's preferred language.
  - `POST /submit-quiz` - Evaluates answers, calculates percentage, updates subject progress and overall average score, and records activity.
- **Analytics & AI Recommendations**:
  - `GET /progress/:user_id` - Overall and per-subject progress metrics.
  - `GET /activity/:user_id` - Chronological recent learning activity feed.
  - `GET /recommendations/:user_id` - Dynamic adaptive learning recommendations diagnosing weak vs strong concepts.
  - `PUT /profile` - Updates profile picture, role, and preferred language.

## 🛠️ Quick Start

### 1. Install Dependencies
```powershell
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

### 3. Run Automated Tests
```powershell
npm test
```

### 4. Start the Server
```powershell
npm start
# Server listens on port 5000: http://localhost:5000/
```
