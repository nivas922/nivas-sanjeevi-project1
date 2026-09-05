# LearnAI System Architecture & Technical Specifications

An intelligent educational platform for multilingual academic summarization, voice-driven audio learning, and adaptive curriculum mastery.

---

## 1. System Architecture

```
[ Frontend: React 19 + Vite + Tailwind CSS ]
                      │
           (HTTP REST / Bearer JWT)
                      ▼
[ Backend: Node.js + Express REST API ]
  ├── Auth Guard & Rate Limiters (Helmet, CORS)
  ├── Multilingual Translation Service (Google Translate / Neural Lexicon)
  ├── Universal Text-to-Speech Engine (Google Cloud TTS / Voice Models)
  ├── AI Summarization & Adaptive Quiz Generator (Gemini / OpenAI)
  └── Database Service Layer (SQLite / MySQL / Postgres)
```

---

## 2. Multilingual Processing Pipeline

1. **Ingestion & Extraction**: Uploaded academic textbooks (PDF, DOCX, TXT, Scanned Images) undergo selectable text extraction using PyMuPDF and pdf-parse.
2. **Dynamic Language Routing**: Requests without an explicit target language automatically retrieve the student's `preferred_language` stored in their `users` record.
3. **Curriculum Synthesis**: Core concepts, formulas, definitions, and code examples are extracted.
4. **Multilingual Translation**: Content is translated into the target language (`ta`, `hi`, `te`, `kn`, `ml`, `bn`, or `en`).
5. **TTS Audio Generation**: Text is mapped to authentic language voice models (`ta-IN-Standard-A`, `hi-IN-Standard-A`, etc.) and rendered into streaming audio.

---

## 3. Adaptive Learning Engine

```
[ Quiz Submission ] ──> Evaluate Score & Calculate Percentage
                                 │
                 ┌───────────────┴──────────────┐
                 ▼                              ▼
      Score < 60% (Weak Topic)       Score >= 80% (Mastered)
                 │                              │
                 ▼                              ▼
   Diagnose Foundational Gaps       Unlock Advanced Challenges
   Recommend Concept Revision       Recommend Level-Up Topics
```
