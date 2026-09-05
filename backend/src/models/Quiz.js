import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class Quiz {
  static format(row) {
    if (!row) return null;
    let questions = [];
    let answers = [];
    try { questions = JSON.parse(row.questions || "[]"); } catch {}
    try { answers = JSON.parse(row.answers_json || "[]"); } catch {}

    return {
      id: row.id,
      book_id: row.book_id,
      bookId: row.book_id,
      user_id: row.user_id,
      userId: row.user_id,
      num_questions: row.num_questions,
      numQuestions: row.num_questions,
      questions,
      score: row.score,
      totalQuestions: row.total_questions || row.num_questions,
      percentage: row.percentage || 0,
      performanceLevel: row.performance_level,
      answers,
      taken_at: row.taken_at,
      takenAt: row.taken_at
    };
  }

  static async findById(id) {
    const row = await dbGet("SELECT * FROM quizzes WHERE id = ?", [id]);
    return this.format(row);
  }

  static async findByUserId(userId) {
    const rows = await dbAll("SELECT * FROM quizzes WHERE user_id = ? ORDER BY taken_at DESC", [userId]);
    return rows.map(this.format);
  }

  static async create({ id = uuidv4(), book_id = null, user_id, num_questions, questions }) {
    await dbRun(
      `INSERT INTO quizzes (id, book_id, user_id, num_questions, questions, total_questions)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, book_id, user_id, num_questions, JSON.stringify(questions), num_questions]
    );
    return this.findById(id);
  }

  static async recordSubmission({ id, score, total_questions, percentage, performance_level, answers }) {
    await dbRun(
      `UPDATE quizzes
       SET score = ?, total_questions = ?, percentage = ?, performance_level = ?, answers_json = ?, taken_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [score, total_questions, percentage, performance_level, JSON.stringify(answers), id]
    );
    return this.findById(id);
  }
}
