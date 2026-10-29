import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class Summary {
  static format(row) {
    if (!row) return null;
    const safeParse = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "object") return val;
      try {
        let parsed = JSON.parse(val);
        if (typeof parsed === "string") {
          try { parsed = JSON.parse(parsed); } catch {}
        }
        return parsed;
      } catch {
        return [];
      }
    };

    const keyConcepts = Array.isArray(safeParse(row.key_concepts_json)) ? safeParse(row.key_concepts_json) : [];
    const definitions = Array.isArray(safeParse(row.definitions_json)) ? safeParse(row.definitions_json) : [];
    const formulas = Array.isArray(safeParse(row.formulas_json)) ? safeParse(row.formulas_json) : [];
    const examples = Array.isArray(safeParse(row.examples_json)) ? safeParse(row.examples_json) : [];
    const rawQuickRev = safeParse(row.quick_revision_json);

    const quickRevision = Array.isArray(rawQuickRev) ? rawQuickRev : (rawQuickRev?.revisionPoints || []);
    const chapters = Array.isArray(rawQuickRev?.chapters) ? rawQuickRev.chapters : [];
    const pageSummaries = Array.isArray(rawQuickRev?.pageSummaries)
      ? rawQuickRev.pageSummaries
      : (Array.isArray(row.page_summaries) ? row.page_summaries : []);

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
      keyPoints: keyConcepts,
      definitions,
      formulas,
      examples,
      quickRevision,
      chapters,
      pageSummaries,
      page_summaries: pageSummaries,
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

  static async findAll() {
    const rows = await dbAll("SELECT * FROM summaries ORDER BY created_at DESC");
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
    const toValidJsonString = (val) => {
      if (typeof val === "string") {
        try {
          JSON.parse(val);
          return val;
        } catch {
          return JSON.stringify([val]);
        }
      }
      return JSON.stringify(val || []);
    };

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
        toValidJsonString(key_concepts),
        toValidJsonString(definitions),
        toValidJsonString(formulas),
        toValidJsonString(examples),
        toValidJsonString(quick_revision),
        audio_url
      ]
    );
    return this.findById(id);
  }

  static async updateAudioUrl(id, audio_url) {
    await dbRun("UPDATE summaries SET audio_url = ? WHERE id = ?", [audio_url, id]);
    return this.findById(id);
  }

  static async deleteById(id) {
    await dbRun("DELETE FROM summaries WHERE id = ?", [id]);
  }
}
