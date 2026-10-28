import sqlite3 from "sqlite3";
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { env } from "./env.js";
import { StoragePreflight } from "./storagePreflight.js";

export const isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

// Validate storage configuration before initializing database - fail closed immediately if invalid
if (!isTurso) {
  const preflightResult = StoragePreflight.validate();
  if (!preflightResult.ok) {
    const errorMsg = `CRITICAL STORAGE PREFLIGHT ERROR: Cannot connect database. ${preflightResult.errors.join("; ")}`;
    console.error("❌ [Database]", errorMsg);
    throw new Error(errorMsg);
  }
}

const sqlite = sqlite3.verbose();
export const localDb = !isTurso
  ? new sqlite.Database(env.DB_FILE, (err) => {
      if (err) {
        console.error("❌ Failed to connect to database:", err.message);
      } else {
        console.log(" Connected to SQLite database:", env.DB_FILE);
      }
    })
  : null;

export const tursoClient = isTurso
  ? createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    })
  : null;

export const db = localDb || tursoClient;


/**
 * Safe conversion of BigInt or large integers to JavaScript Numbers.
 * Rejects unsafe values beyond Number.MIN_SAFE_INTEGER..Number.MAX_SAFE_INTEGER.
 */
export const safeConvertRowId = (val) => {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === "bigint") {
    if (val < BigInt(Number.MIN_SAFE_INTEGER) || val > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError(
        `Unsafe BigInt conversion: value ${val.toString()} exceeds JavaScript Number safe integer limits.`
      );
    }
    return Number(val);
  }
  if (typeof val === "number") {
    if (!Number.isSafeInteger(val)) {
      throw new RangeError(
        `Unsafe integer: value ${val} exceeds JavaScript Number safe integer limits.`
      );
    }
    return val;
  }
  return val;
};

// Promise wrappers with normalized results & safe rowid conversion
export const dbRun = (sql, params = []) => {
  const activeTx = txContext.getStore()?.tursoTx;
  if (isTurso && activeTx) {
    return activeTx.execute({ sql, args: params }).then((res) => {
      const safeId = safeConvertRowId(res.lastInsertRowid);
      return {
        lastID: safeId,
        lastInsertRowid: safeId,
        changes: res.rowsAffected,
        rowsAffected: res.rowsAffected
      };
    });
  }

  if (isTurso && tursoClient) {
    return tursoClient.execute({ sql, args: params }).then((res) => {
      const safeId = safeConvertRowId(res.lastInsertRowid);
      return {
        lastID: safeId,
        lastInsertRowid: safeId,
        changes: res.rowsAffected,
        rowsAffected: res.rowsAffected
      };
    });
  }

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      try {
        const safeId = safeConvertRowId(this.lastID);
        resolve({
          lastID: safeId,
          lastInsertRowid: safeId,
          changes: this.changes,
          rowsAffected: this.changes
        });
      } catch (convErr) {
        reject(convErr);
      }
    });
  });
};

export const dbGet = (sql, params = []) => {
  const activeTx = txContext.getStore()?.tursoTx;
  if (isTurso && activeTx) {
    return activeTx.execute({ sql, args: params }).then((res) => {
      const row = res.rows[0];
      return row ? { ...row } : undefined;
    });
  }

  if (isTurso && tursoClient) {
    return tursoClient.execute({ sql, args: params }).then((res) => {
      const row = res.rows[0];
      return row ? { ...row } : undefined;
    });
  }

  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row ? { ...row } : undefined);
    });
  });
};

export const dbAll = (sql, params = []) => {
  const activeTx = txContext.getStore()?.tursoTx;
  if (isTurso && activeTx) {
    return activeTx.execute({ sql, args: params }).then((res) => {
      return (res.rows || []).map((r) => ({ ...r }));
    });
  }

  if (isTurso && tursoClient) {
    return tursoClient.execute({ sql, args: params }).then((res) => {
      return (res.rows || []).map((r) => ({ ...r }));
    });
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve((rows || []).map((r) => ({ ...r })));
    });
  });
};

import { AsyncLocalStorage } from "async_hooks";

const txContext = new AsyncLocalStorage();
let savepointCounter = 0;

/**
 * Execute work in an isolated database transaction.
 * Supports arbitrary transaction nesting via SQLite SAVEPOINTs in local SQLite.
 * Prepares a dedicated branch for Turso interactive sessions via tursoClient.transaction('write').
 *
 * UNRESOLVED WARNING: Turso remote transaction behavior remains UNVERIFIED against a live cloud database.
 */
export const withTransaction = async (workFn) => {
  const parent = txContext.getStore();

  // Branch 1: Turso Interactive Session Transaction (Preparation Branch)
  if (isTurso && tursoClient) {
    if (!parent) {
      const tursoTx = await tursoClient.transaction("write");
      const context = { depth: 1, id: "root_turso", tursoTx };
      return await txContext.run(context, async () => {
        try {
          const result = await workFn();
          await tursoTx.commit();
          return result;
        } catch (err) {
          try {
            await tursoTx.rollback();
          } catch (rollbackErr) {
            console.error("⚠️ [Turso Transaction] Root rollback error:", rollbackErr.message);
          }
          throw err;
        }
      });
    } else {
      // Nested savepoint within active Turso transaction
      savepointCounter = (savepointCounter + 1) % 1000000;
      const savepointName = `sp_${parent.depth + 1}_${Date.now()}_${savepointCounter}`;
      await parent.tursoTx.execute(`SAVEPOINT ${savepointName};`);
      const context = { depth: parent.depth + 1, id: savepointName, tursoTx: parent.tursoTx };
      return await txContext.run(context, async () => {
        try {
          const result = await workFn();
          await parent.tursoTx.execute(`RELEASE SAVEPOINT ${savepointName};`);
          return result;
        } catch (err) {
          try {
            await parent.tursoTx.execute(`ROLLBACK TO SAVEPOINT ${savepointName};`);
            await parent.tursoTx.execute(`RELEASE SAVEPOINT ${savepointName};`);
          } catch (rollbackErr) {
            console.error(`⚠️ [Turso Transaction] Savepoint rollback error (${savepointName}):`, rollbackErr.message);
          }
          throw err;
        }
      });
    }
  }

  // Branch 2: Local SQLite Transactions (Active & Fully Verified)
  if (!parent) {
    // Root / Outermost transaction
    await dbRun("BEGIN TRANSACTION;");
    const context = { depth: 1, id: "root" };
    return await txContext.run(context, async () => {
      try {
        const result = await workFn();
        await dbRun("COMMIT;");
        return result;
      } catch (err) {
        try {
          await dbRun("ROLLBACK;");
        } catch (rollbackErr) {
          console.error("⚠️ [Database Transaction] Root rollback error:", rollbackErr.message);
        }
        throw err;
      }
    });
  } else {
    // Nested transaction: generate unique, safe savepoint name
    savepointCounter = (savepointCounter + 1) % 1000000;
    const savepointName = `sp_${parent.depth + 1}_${Date.now()}_${savepointCounter}`;
    await dbRun(`SAVEPOINT ${savepointName};`);
    const context = { depth: parent.depth + 1, id: savepointName };
    return await txContext.run(context, async () => {
      try {
        const result = await workFn();
        await dbRun(`RELEASE SAVEPOINT ${savepointName};`);
        return result;
      } catch (err) {
        try {
          await dbRun(`ROLLBACK TO SAVEPOINT ${savepointName};`);
          await dbRun(`RELEASE SAVEPOINT ${savepointName};`);
        } catch (rollbackErr) {
          console.error(`⚠️ [Database Transaction] Savepoint rollback error (${savepointName}):`, rollbackErr.message);
        }
        throw err;
      }
    });
  }
};


export const initDb = async () => {
  // Concurrency & reliability pragmas
  await dbRun("PRAGMA foreign_keys = ON;");
  if (!isTurso) {
    await dbRun("PRAGMA journal_mode = WAL;");
    await dbRun("PRAGMA synchronous = NORMAL;");
    await dbRun("PRAGMA busy_timeout = 5000;");
  }

  // 1. Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      email_verified INTEGER DEFAULT 0,
      mobile_number TEXT UNIQUE,
      mobile_verified INTEGER DEFAULT 0,
      google_id TEXT,
      password_hash TEXT,
      email_or_mobile TEXT,
      login_method TEXT NOT NULL,
      profile_pic_url TEXT,
      role TEXT DEFAULT 'Computer Science & Engineering (CSE)',
      preferred_language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Auto-migration for existing users table columns
  try {
    const userCols = await dbAll("PRAGMA table_info(users);");
    const colNames = userCols.map((c) => c.name);
    
    if (!colNames.includes("email")) {
      await dbRun("ALTER TABLE users ADD COLUMN email TEXT;");
    }
    if (!colNames.includes("email_verified")) {
      await dbRun("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;");
    }
    if (!colNames.includes("mobile_number")) {
      await dbRun("ALTER TABLE users ADD COLUMN mobile_number TEXT;");
    }
    if (!colNames.includes("mobile_verified")) {
      await dbRun("ALTER TABLE users ADD COLUMN mobile_verified INTEGER DEFAULT 0;");
    }
    if (!colNames.includes("google_id")) {
      await dbRun("ALTER TABLE users ADD COLUMN google_id TEXT;");
    }
    if (!colNames.includes("password_hash")) {
      await dbRun("ALTER TABLE users ADD COLUMN password_hash TEXT;");
    }

    // Backfill email & mobile from legacy email_or_mobile if available
    await dbRun(`
      UPDATE users 
      SET email = email_or_mobile 
      WHERE email IS NULL AND email_or_mobile LIKE '%@%'
    `);
    await dbRun(`
      UPDATE users 
      SET mobile_number = email_or_mobile 
      WHERE mobile_number IS NULL AND email_or_mobile NOT LIKE '%@%' AND email_or_mobile IS NOT NULL
    `);
  } catch (migErr) {
    console.warn("User migration note:", migErr.message);
  }

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

  // OTP Verification Cache Table (supports mobile OTP, email verification, password reset)
  try {
    const otpCols = await dbAll("PRAGMA table_info(otp_verifications);");
    const colNames = otpCols.map((c) => c.name);
    if (otpCols.length > 0 && !colNames.includes("identifier")) {
      // Migrate old schema by recreating table (ephemeral data)
      await dbRun("DROP TABLE otp_verifications;");
    }
  } catch (err) {
    console.warn("OTP table check:", err.message);
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      type TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0,
      locked_until INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      UNIQUE(identifier, type)
    );
  `);

  // 8. Document Chunks table (Phase 2 Chunking)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      chapter TEXT,
      section TEXT,
      page_start INTEGER DEFAULT 1,
      page_end INTEGER DEFAULT 1,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );
  `);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_chunks_book_id ON document_chunks(book_id);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_summaries_book_id ON summaries(book_id);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_quizzes_book_id ON quizzes(book_id);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_log(user_id);`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_verifications(identifier);`);

  // Default guest/student user ensuring foreign key integrity without login
  await dbRun(`
    INSERT OR IGNORE INTO users (id, name, email, email_verified, login_method, role, preferred_language)
    VALUES ('usr_default', 'Student', 'student@university.edu', 1, 'direct', 'Computer Science & Engineering (CSE)', 'en');
  `);

  console.log(" Database schema initialized successfully with production indexes.");
};

/**
 * Checkpoint WAL journal and close SQLite connection cleanly.
 * Rejects if either checkpointing or database closure fails.
 */
export const checkpointAndCloseDb = async () => {
  if (isTurso) {
    if (tursoClient) {
      tursoClient.close();
      console.log(" [Database Shutdown] Turso client connection closed cleanly.");
    }
    return;
  }

  return new Promise((resolve, reject) => {
    if (!db) return resolve();
    let isClosed = false;
    const closeDatabase = (checkpointError = null) => {
      if (isClosed) return;
      isClosed = true;
      db.close((closeErr) => {
        if (closeErr) {
          console.error("❌ [Database Shutdown] Database close error:", closeErr.message);
          return reject(checkpointError || closeErr);
        }
        if (checkpointError) {
          return reject(checkpointError);
        }
        console.log(" [Database Shutdown] SQLite database connection closed cleanly.");
        resolve();
      });
    };

    db.run("PRAGMA wal_checkpoint(TRUNCATE);", [], (checkpointErr) => {
      if (checkpointErr) {
        console.error("⚠️ [Database Shutdown] WAL checkpoint error:", checkpointErr.message);
        closeDatabase(checkpointErr);
      } else {
        console.log(" [Database Shutdown] SQLite WAL checkpointed successfully.");
        closeDatabase(null);
      }
    });
  });
};


