# LearnAI Database Architecture & Schema Reference

The platform uses a relational SQL model (SQLite in zero-config mode, with full native support for MySQL 8.0 and PostgreSQL via `.env`).

---

## 1. Entity Relationship Overview

```
 [Users] (1) ────< (N) [Books] (1) ────< (N) [Summaries]
    │                     │
    │ (1)                 │ (1)
    │                     │
    ├────< (N) [Quizzes] <┘
    │
    ├────< (N) [Progress]
    │
    └────< (N) [ActivityLog]
```

---

## 2. Table Dictionaries

### 2.1 `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Unique user identifier (`usr_<uuid>`) |
| `name` | VARCHAR(255) | NOT NULL | User's full name |
| `email_or_mobile` | VARCHAR(255) | UNIQUE, NOT NULL | Email address or 10-digit mobile number |
| `login_method` | VARCHAR(32) | NOT NULL | 'google', 'mobile', or 'email' |
| `profile_pic_url` | TEXT | NULLABLE | Uploaded photo or Google avatar URL |
| `role` | VARCHAR(128) | DEFAULT 'CSE' | Departmental role (CSE, IT, ECE, MECH, etc.) |
| `preferred_language` | VARCHAR(10) | DEFAULT 'en' | 'en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn' |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |

### 2.2 `books`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Textbook UUID |
| `user_id` | VARCHAR(64) | FOREIGN KEY (users.id) | Ingesting student ID |
| `file_url` | TEXT | NOT NULL | Uploaded document path (`/uploads/...`) |
| `title` | VARCHAR(255) | NOT NULL | Clean textbook title |
| `subject` | VARCHAR(255) | NOT NULL | Curriculum subject name |
| `file_name` | VARCHAR(255) | NULLABLE | Original filename |
| `file_size` | BIGINT | NULLABLE | File size in bytes (Max 50MB) |
| `extracted_text` | TEXT | NULLABLE | Text extracted via PyMuPDF / pdf-parse |
| `upload_date` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ingestion timestamp |

### 2.3 `summaries`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Summary UUID |
| `book_id` | VARCHAR(64) | FOREIGN KEY (books.id) | Linked textbook ID |
| `user_id` | VARCHAR(64) | FOREIGN KEY (users.id) | Generating student ID |
| `language` | VARCHAR(10) | NOT NULL | Target language ('ta', 'hi', 'en', etc.) |
| `summary_text` | TEXT | NOT NULL | AI-generated summary content |
| `key_concepts_json` | TEXT | NULLABLE | JSON array of key concepts |
| `definitions_json` | TEXT | NULLABLE | JSON array of `{ term, meaning }` |
| `formulas_json` | TEXT | NULLABLE | JSON array of `{ name, formula, description }` |
| `examples_json` | TEXT | NULLABLE | JSON array of code/real-world examples |
| `audio_url` | TEXT | NULLABLE | Synthesized TTS MP3 URL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

### 2.4 `quizzes`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Quiz UUID |
| `book_id` | VARCHAR(64) | FOREIGN KEY (books.id) | Associated textbook ID |
| `user_id` | VARCHAR(64) | FOREIGN KEY (users.id) | Taking student ID |
| `num_questions` | INT | NOT NULL | Question count (5, 10, 15, 20) |
| `questions` | TEXT | NOT NULL | JSON array of question objects |
| `score` | INT | DEFAULT 0 | Correct answers count |
| `total_questions` | INT | DEFAULT 0 | Total question count |
| `percentage` | INT | DEFAULT 0 | Score percentage (0-100%) |
| `performance_level` | VARCHAR(64) | DEFAULT 'Pending' | 'Weak', 'Needs Improvement', 'Good', 'Strong' |
| `answers_json` | TEXT | NULLABLE | Review of submitted answers & explanations |
| `taken_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Submission timestamp |

### 2.5 `progress`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Progress record UUID |
| `user_id` | VARCHAR(64) | FOREIGN KEY (users.id) | Student ID |
| `subject` | VARCHAR(255) | NOT NULL | Subject name |
| `books_studied_count`| INT | DEFAULT 0 | Textbooks studied in this subject |
| `summaries_count` | INT | DEFAULT 0 | Summaries generated in this subject |
| `quizzes_taken` | INT | DEFAULT 0 | Completed quizzes |
| `average_score` | FLOAT | DEFAULT 0.0 | Cumulative average score |
| `last_updated` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last activity timestamp |

### 2.6 `activity_log`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PRIMARY KEY | Activity log UUID |
| `user_id` | VARCHAR(64) | FOREIGN KEY (users.id) | Student ID |
| `activity_type` | VARCHAR(64) | NOT NULL | 'upload', 'summary', 'quiz' |
| `title` | VARCHAR(255) | NOT NULL | Activity headline description |
| `reference_id` | VARCHAR(64) | NULLABLE | ID of target book/summary/quiz |
| `timestamp` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Event timestamp |
