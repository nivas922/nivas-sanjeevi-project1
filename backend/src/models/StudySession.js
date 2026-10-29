import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class StudySession {
  static format(row) {
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      userId: row.user_id,
      activity_type: row.activity_type,
      activityType: row.activity_type,
      duration_seconds: row.duration_seconds,
      durationSeconds: row.duration_seconds,
      date: row.date,
      created_at: row.created_at,
      createdAt: row.created_at
    };
  }

  static async create({ id = uuidv4(), user_id, activity_type, duration_seconds, date }) {
    await dbRun(
      `INSERT INTO study_sessions (id, user_id, activity_type, duration_seconds, date)
       VALUES (?, ?, ?, ?, ?)`,
      [id, user_id, activity_type, duration_seconds, date]
    );
    const row = await dbGet("SELECT * FROM study_sessions WHERE id = ?", [id]);
    return this.format(row);
  }

  static async findByUserId(userId) {
    const rows = await dbAll(
      "SELECT * FROM study_sessions WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    return rows.map(this.format);
  }

  static async getStats(userId, localDate) {
    // 1. Calculate today's minutes from sessions on localDate
    const todayRow = await dbGet(
      "SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds FROM study_sessions WHERE user_id = ? AND date = ?",
      [userId, localDate]
    );
    const todaySeconds = todayRow ? Number(todayRow.total_seconds) : 0;
    const todayMinutes = Math.round(todaySeconds / 60);

    // 2. Generate exactly the last 7 calendar days ending on localDate
    const weeklyData = [];
    // Parse localDate safely at noon UTC to prevent daylight saving timezone shifts
    const baseDate = new Date(`${localDate}T12:00:00Z`);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const isToday = (i === 0);
      const dayLabel = isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
      const formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

      weeklyData.push({
        date: dateStr,
        dayLabel,
        formattedDate,
        minutes: 0,
        isToday
      });
    }

    const oldestDate = weeklyData[0].date;
    const rows = await dbAll(
      `SELECT date, COALESCE(SUM(duration_seconds), 0) as total_seconds
       FROM study_sessions
       WHERE user_id = ? AND date >= ?
       GROUP BY date`,
      [userId, oldestDate]
    );

    const map = {};
    for (const r of rows) {
      map[r.date] = Math.round(Number(r.total_seconds) / 60);
    }

    for (const day of weeklyData) {
      if (map[day.date] !== undefined) {
        day.minutes = map[day.date];
      }
    }

    return {
      todaySeconds,
      todayMinutes,
      weeklyData
    };
  }
}

