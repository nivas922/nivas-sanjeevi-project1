import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class ActivityLog {
  static format(row) {
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      userId: row.user_id,
      activity_type: row.activity_type,
      activityType: row.activity_type,
      type: row.activity_type,
      title: row.title,
      reference_id: row.reference_id,
      referenceId: row.reference_id,
      timestamp: row.timestamp,
      createdAt: row.timestamp,
      time: "Just now",
      badge: row.activity_type.charAt(0).toUpperCase() + row.activity_type.slice(1),
      badgeColor: 
        row.activity_type === "upload" ? "bg-blue-100 text-blue-700" :
        row.activity_type === "summary" ? "bg-purple-100 text-purple-700" :
        row.activity_type === "quiz" ? "bg-amber-100 text-amber-700" :
        "bg-slate-100 text-slate-700"
    };
  }

  static async findByUserId(userId, limit = 20) {
    const rows = await dbAll(
      "SELECT * FROM activity_log WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
      [userId, limit]
    );
    return rows.map(this.format);
  }

  static async create({ id = uuidv4(), user_id, activity_type, title, reference_id = null }) {
    await dbRun(
      `INSERT INTO activity_log (id, user_id, activity_type, title, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, user_id, activity_type, title, reference_id]
    );
    const row = await dbGet("SELECT * FROM activity_log WHERE id = ?", [id]);
    return this.format(row);
  }
}
