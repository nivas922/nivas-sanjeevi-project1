import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class Summary {
  static format(row) {
    if (!row) return null;
    let keyConcepts = [];
    let definitions = [];
    let formulas = [];
    let examples = [];
    let quickRevision = [];

    try { keyConcepts = JSON.parse(row.key_concepts_json || "[]"); } catch {}
    try { definitions = JSON.parse(row.definitions_json || "[]"); } catch {}
    try { formulas = JSON.parse(row.formulas_json || "[]"); } catch {}
    try { examples = JSON.parse(row.examples_json || "[]"); } catch {}
    try { quickRevision = JSON.parse(row.quick_revision_json || "[]"); } catch {}

    return {
      id: row.id,
      book_id: row.book_id,
      bookId: row.book_id,
      user_id: row.user_id,
      userId: row.user_id,
      language: row.language,
      summary_text: row.summary_text,
      summaryText: row.summary_text,
      keyConcepts,
      definitions,
      formulas,
      examples,
      quickRevision,
      audio_url: row.audio_url,
      audioUrl: row.audio_url,
      created_at: row.created_at,
      createdAt: row.created_at
    };
  }

  static async findById(id) {
    const row = await dbGet("SELECT * FROM summaries WHERE id = ?", [id]);
    return this.format(row);
  }

  static async findByBookId(bookId) {
    const rows = await dbAll("SELECT * FROM summaries WHERE book_id = ? ORDER BY created_at DESC", [bookId]);
    return rows.map(this.format);
  }

  static async findByUserId(userId) {
    const rows = await dbAll("SELECT * FROM summaries WHERE user_id = ? ORDER BY created_at DESC", [userId]);
    return rows.map(this.format);
  }

  static async create({
    id = uuidv4(),
    book_id,
    user_id,
    language,
    summary_text,
    key_concepts = [],
    definitions = [],
    formulas = [],
    examples = [],
    quick_revision = [],
    audio_url = null
  }) {
    await dbRun(
      `INSERT INTO summaries (
        id, book_id, user_id, language, summary_text,
        key_concepts_json, definitions_json, formulas_json, examples_json, quick_revision_json,
        audio_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        book_id,
        user_id,
        language,
        summary_text,
        JSON.stringify(key_concepts),
        JSON.stringify(definitions),
        JSON.stringify(formulas),
        JSON.stringify(examples),
        JSON.stringify(quick_revision),
        audio_url
      ]
    );
    return this.findById(id);
  }

  static async updateAudioUrl(id, audio_url) {
    await dbRun("UPDATE summaries SET audio_url = ? WHERE id = ?", [audio_url, id]);
    return this.findById(id);
  }
}
