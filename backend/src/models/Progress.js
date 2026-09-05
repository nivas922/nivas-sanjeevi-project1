import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class Progress {
  static format(row) {
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      userId: row.user_id,
      subject: row.subject,
      books_studied_count: row.books_studied_count || 0,
      booksStudiedCount: row.books_studied_count || 0,
      summaries_count: row.summaries_count || 0,
      summariesCount: row.summaries_count || 0,
      quizzes_taken: row.quizzes_taken || 0,
      quizzesTaken: row.quizzes_taken || 0,
      average_score: Math.round(row.average_score || 0),
      averageScore: Math.round(row.average_score || 0),
      last_updated: row.last_updated,
      lastUpdated: row.last_updated
    };
  }

  static async findByUserId(userId) {
    const rows = await dbAll("SELECT * FROM progress WHERE user_id = ? ORDER BY last_updated DESC", [userId]);
    return rows.map(this.format);
  }

  static async findByUserAndSubject(userId, subject) {
    const row = await dbGet("SELECT * FROM progress WHERE user_id = ? AND LOWER(subject) = LOWER(?)", [userId, subject]);
    return this.format(row);
  }

  static async getAggregateForUser(userId) {
    const row = await dbGet(
      `SELECT 
         COALESCE(SUM(books_studied_count), 0) as total_books,
         COALESCE(SUM(summaries_count), 0) as total_summaries,
         COALESCE(SUM(quizzes_taken), 0) as total_quizzes,
         COALESCE(AVG(CASE WHEN quizzes_taken > 0 THEN average_score ELSE NULL END), 0) as overall_average
       FROM progress
       WHERE user_id = ?`,
      [userId]
    );

    const subjectRows = await this.findByUserId(userId);

    return {
      books_studied_count: row ? Number(row.total_books) : 0,
      summaries_count: row ? Number(row.total_summaries) : 0,
      quizzes_taken: row ? Number(row.total_quizzes) : 0,
      average_score: row ? Math.round(Number(row.overall_average)) : 0,
      subject_progress: subjectRows
    };
  }

  static async incrementBookCount(userId, subject) {
    const existing = await this.findByUserAndSubject(userId, subject);
    if (existing) {
      await dbRun(
        `UPDATE progress
         SET books_studied_count = books_studied_count + 1, last_updated = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [existing.id]
      );
      return this.findByUserAndSubject(userId, subject);
    } else {
      const id = uuidv4();
      await dbRun(
        `INSERT INTO progress (id, user_id, subject, books_studied_count, summaries_count, quizzes_taken, average_score)
         VALUES (?, ?, ?, 1, 0, 0, 0)`,
        [id, userId, subject]
      );
      return this.findByUserAndSubject(userId, subject);
    }
  }

  static async incrementSummaryCount(userId, subject) {
    const existing = await this.findByUserAndSubject(userId, subject);
    if (existing) {
      await dbRun(
        `UPDATE progress
         SET summaries_count = summaries_count + 1, last_updated = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [existing.id]
      );
      return this.findByUserAndSubject(userId, subject);
    } else {
      const id = uuidv4();
      await dbRun(
        `INSERT INTO progress (id, user_id, subject, books_studied_count, summaries_count, quizzes_taken, average_score)
         VALUES (?, ?, ?, 1, 1, 0, 0)`,
        [id, userId, subject]
      );
      return this.findByUserAndSubject(userId, subject);
    }
  }

  static async recordQuizScore(userId, subject, newScorePercentage) {
    const existing = await this.findByUserAndSubject(userId, subject);
    if (existing) {
      const totalQuizzes = existing.quizzes_taken + 1;
      const prevTotalScore = existing.average_score * existing.quizzes_taken;
      const newAverage = Math.round((prevTotalScore + newScorePercentage) / totalQuizzes);

      await dbRun(
        `UPDATE progress
         SET quizzes_taken = ?, average_score = ?, last_updated = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [totalQuizzes, newAverage, existing.id]
      );
      return this.findByUserAndSubject(userId, subject);
    } else {
      const id = uuidv4();
      await dbRun(
        `INSERT INTO progress (id, user_id, subject, books_studied_count, summaries_count, quizzes_taken, average_score)
         VALUES (?, ?, ?, 1, 0, 1, ?)`,
        [id, userId, subject, newScorePercentage]
      );
      return this.findByUserAndSubject(userId, subject);
    }
  }
}
