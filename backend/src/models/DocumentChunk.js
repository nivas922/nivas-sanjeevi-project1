import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class DocumentChunk {
  static format(row) {
    if (!row) return null;
    return {
      id: row.id,
      chunkId: row.id,
      bookId: row.book_id,
      book_id: row.book_id,
      chapter: row.chapter,
      section: row.section,
      pageStart: row.page_start,
      page_start: row.page_start,
      pageEnd: row.page_end,
      page_end: row.page_end,
      chunkIndex: row.chunk_index,
      chunk_index: row.chunk_index,
      text: row.text,
      createdAt: row.created_at,
      created_at: row.created_at
    };
  }

  static async findById(id) {
    const row = await dbGet("SELECT * FROM document_chunks WHERE id = ?", [id]);
    return this.format(row);
  }

  static async findByBookId(bookId) {
    const rows = await dbAll(
      "SELECT * FROM document_chunks WHERE book_id = ? ORDER BY chunk_index ASC",
      [bookId]
    );
    return rows.map(this.format);
  }

  static async deleteByBookId(bookId) {
    await dbRun("DELETE FROM document_chunks WHERE book_id = ?", [bookId]);
  }

  static async create({
    id = "chk_" + uuidv4().slice(0, 12),
    book_id,
    chapter = "Chapter 1: Overview",
    section = "General Content",
    page_start = 1,
    page_end = 1,
    chunk_index = 0,
    text
  }) {
    await dbRun(
      `INSERT INTO document_chunks (id, book_id, chapter, section, page_start, page_end, chunk_index, text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, book_id, chapter, section, page_start, page_end, chunk_index, text]
    );
    return this.findById(id);
  }

  static async createMany(chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return [];
    }
    const created = [];
    for (const chunk of chunks) {
      const item = await this.create({
        id: chunk.id || chunk.chunkId || "chk_" + uuidv4().slice(0, 12),
        book_id: chunk.book_id || chunk.bookId,
        chapter: chunk.chapter || "Chapter 1: Overview",
        section: chunk.section || "General Content",
        page_start: chunk.page_start || chunk.pageStart || 1,
        page_end: chunk.page_end || chunk.pageEnd || 1,
        chunk_index: chunk.chunk_index !== undefined ? chunk.chunk_index : (chunk.chunkIndex || 0),
        text: chunk.text
      });
      created.push(item);
    }
    return created;
  }
}
