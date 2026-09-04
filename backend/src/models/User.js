import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class User {
  static format(user) {
    if (!user) return null;
    const isEmail = user.email_or_mobile?.includes("@");
    return {
      id: user.id,
      name: user.name,
      email: isEmail ? user.email_or_mobile : null,
      mobile: !isEmail ? user.email_or_mobile : null,
      email_or_mobile: user.email_or_mobile,
      login_method: user.login_method,
      profile_pic_url: user.profile_pic_url,
      avatar: user.profile_pic_url,
      role: user.role,
      department: user.role,
      preferred_language: user.preferred_language,
      preferredLanguage: user.preferred_language,
      created_at: user.created_at
    };
  }

  static async findById(id) {
    const row = await dbGet("SELECT * FROM users WHERE id = ?", [id]);
    return this.format(row);
  }

  static async findByEmailOrMobile(identifier) {
    const row = await dbGet("SELECT * FROM users WHERE email_or_mobile = ?", [identifier]);
    return this.format(row);
  }

  static async create({ id = uuidv4(), name, email_or_mobile, login_method, profile_pic_url = null, role = "Computer Science & Engineering (CSE)", preferred_language = "en" }) {
    await dbRun(
      `INSERT INTO users (id, name, email_or_mobile, login_method, profile_pic_url, role, preferred_language)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, email_or_mobile, login_method, profile_pic_url, role, preferred_language]
    );
    return this.findById(id);
  }

  static async update(id, fields) {
    const allowed = ["name", "profile_pic_url", "role", "preferred_language"];
    const updates = [];
    const values = [];

    // Support camelCase mappings
    if (fields.avatar && !fields.profile_pic_url) fields.profile_pic_url = fields.avatar;
    if (fields.preferredLanguage && !fields.preferred_language) fields.preferred_language = fields.preferredLanguage;
    if (fields.department && !fields.role) fields.role = fields.department;

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length > 0) {
      values.push(id);
      await dbRun(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
    }
    return this.findById(id);
  }
}
