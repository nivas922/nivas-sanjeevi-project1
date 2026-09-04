-- ====================================================================
-- AI-Based Multilingual Textbook Summarization & Adaptive Learning System
-- Database Schema DDL (PostgreSQL / MySQL / SQLite compatible)
-- ====================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email_or_mobile VARCHAR(255) UNIQUE NOT NULL,
    login_method VARCHAR(32) NOT NULL, -- 'google', 'mobile', 'email'
    profile_pic_url TEXT,
    role VARCHAR(128) DEFAULT 'Computer Science & Engineering (CSE)', -- CSE, IT, ECE, MECH, etc.
    preferred_language VARCHAR(10) DEFAULT 'en', -- en, ta, hi, te, kn, ml, bn
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Books Table
CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    file_url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_size BIGINT,
    extracted_text TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Summaries Table
CREATE TABLE IF NOT EXISTS summaries (
    id VARCHAR(64) PRIMARY KEY,
    book_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    language VARCHAR(10) NOT NULL,
    summary_text TEXT NOT NULL,
    key_concepts_json TEXT,
    definitions_json TEXT,
    formulas_json TEXT,
    examples_json TEXT,
    quick_revision_json TEXT,
    audio_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Quizzes Table
CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(64) PRIMARY KEY,
    book_id VARCHAR(64),
    user_id VARCHAR(64) NOT NULL,
    num_questions INT NOT NULL,
    questions TEXT NOT NULL,
    score INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    percentage INT DEFAULT 0,
    performance_level VARCHAR(64) DEFAULT 'Pending',
    answers_json TEXT,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Progress Table (Zero-initialized for new accounts)
CREATE TABLE IF NOT EXISTS progress (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    books_studied_count INT DEFAULT 0,
    summaries_count INT DEFAULT 0,
    quizzes_taken INT DEFAULT 0,
    average_score FLOAT DEFAULT 0.0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, subject)
);

-- 6. ActivityLog Table (Empty for new accounts)
CREATE TABLE IF NOT EXISTS activity_log (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    activity_type VARCHAR(64) NOT NULL, -- 'upload', 'summary', 'quiz'
    title VARCHAR(255) NOT NULL,
    reference_id VARCHAR(64),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. OTP Verifications Cache
CREATE TABLE IF NOT EXISTS otp_verifications (
    mobile VARCHAR(32) PRIMARY KEY,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_book_id ON summaries(book_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_log(user_id);
