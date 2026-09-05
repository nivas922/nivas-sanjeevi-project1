import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class Book {
  static format(row) {
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      userId: row.user_id,
      file_url: row.file_url,
      fileUrl: row.file_url,
      title: row.title,
      subject: row.subject,
      fileName: row.file_name,
      fileSize: row.file_size,
      extractedText: row.extracted_text,
      upload_date: row.upload_date,
      uploadDate: row.upload_date
    };
  }

  static async findById(id) {
    const row = await dbGet("SELECT * FROM books WHERE id = ?", [id]);
    return this.format(row);
  }

  static async findByUserId(userId) {
    const rows = await dbAll("SELECT * FROM books WHERE user_id = ? ORDER BY upload_date DESC", [userId]);
    return rows.map(this.format);
  }

  static async create({ id = uuidv4(), user_id, file_url, title, subject, file_name = null, file_size = 0, extracted_text = "" }) {
    await dbRun(
      `INSERT INTO books (id, user_id, file_url, title, subject, file_name, file_size, extracted_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, file_url, title, subject, file_name, file_size, extracted_text]
    );
    return this.findById(id);
  }
}
