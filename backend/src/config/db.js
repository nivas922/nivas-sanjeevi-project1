import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { env } from "./env.js";

// Ensure data directory exists
const dbDir = path.dirname(env.DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = sqlite3.verbose();
export const db = new sqlite.Database(env.DB_FILE, (err) => {
  if (err) {
    console.error("❌ Failed to connect to database:", err.message);
  } else {
    console.log(" Connected to SQLite database:", env.DB_FILE);
  }
});

// Promise wrappers
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
};

export const initDb = async () => {
  // Foreign keys enabled
  await dbRun("PRAGMA foreign_keys = ON;");

  // 1. Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email_or_mobile TEXT UNIQUE NOT NULL,
      login_method TEXT NOT NULL,
      profile_pic_url TEXT,
      role TEXT DEFAULT 'Computer Science & Engineering (CSE)',
      preferred_language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Books table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      file_url TEXT NOT NULL,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      file_name TEXT,
      file_size INTEGER,
      extracted_text TEXT,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Summaries table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS summaries (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      language TEXT NOT NULL,
      summary_text TEXT NOT NULL,
      key_concepts_json TEXT,
      definitions_json TEXT,
      formulas_json TEXT,
      examples_json TEXT,
      quick_revision_json TEXT,
      audio_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 4. Quizzes table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      book_id TEXT,
      user_id TEXT NOT NULL,
      num_questions INTEGER NOT NULL,
      questions TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      percentage INTEGER DEFAULT 0,
      performance_level TEXT DEFAULT 'Pending',
      answers_json TEXT,
      taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 5. Progress table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      books_studied_count INTEGER DEFAULT 0,
      summaries_count INTEGER DEFAULT 0,
      quizzes_taken INTEGER DEFAULT 0,
      average_score REAL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, subject)
    );
  `);

  // 6. ActivityLog table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      reference_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // OTP Verification Cache Table for mobile login
  await dbRun(`
    CREATE TABLE IF NOT EXISTS otp_verifications (
      mobile TEXT PRIMARY KEY,
      otp_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  console.log(" Database schema initialized successfully (Users, Books, Summaries, Quizzes, Progress, ActivityLog).");
};
