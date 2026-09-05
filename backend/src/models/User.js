import { dbRun, dbGet, dbAll } from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

export class User {
  static format(user) {
    if (!user) return null;
    const email = user.email || (user.email_or_mobile?.includes("@") ? user.email_or_mobile : null);
    const mobile = user.mobile_number || (!user.email_or_mobile?.includes("@") ? user.email_or_mobile : null);

    return {
      id: user.id,
      name: user.name,
      email,
      email_verified: Boolean(user.email_verified),
      emailVerified: Boolean(user.email_verified),
      mobile,
      mobile_number: mobile,
      mobile_verified: Boolean(user.mobile_verified),
      mobileVerified: Boolean(user.mobile_verified),
      google_id: user.google_id || null,
      email_or_mobile: user.email_or_mobile || email || mobile,
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

  static async findByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    const row = await dbGet(
      "SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(email_or_mobile) = ?",
      [normalized, normalized]
    );
    return this.format(row);
  }

  static async findRawByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    return dbGet(
      "SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(email_or_mobile) = ?",
      [normalized, normalized]
    );
  }

  static async findByMobile(mobile) {
    if (!mobile) return null;
    const sanitized = mobile.trim();
    const row = await dbGet(
      "SELECT * FROM users WHERE mobile_number = ? OR email_or_mobile = ?",
      [sanitized, sanitized]
    );
    return this.format(row);
  }

  static async findByGoogleId(googleId) {
    if (!googleId) return null;
    const row = await dbGet("SELECT * FROM users WHERE google_id = ?", [googleId]);
    return this.format(row);
  }

  static async findByEmailOrMobile(identifier) {
    if (!identifier) return null;
    const trimmed = identifier.trim();
    const lower = trimmed.toLowerCase();
    const row = await dbGet(
      `SELECT * FROM users 
       WHERE LOWER(email) = ? 
          OR mobile_number = ? 
          OR LOWER(email_or_mobile) = ? 
          OR email_or_mobile = ?`,
      [lower, trimmed, lower, trimmed]
    );
    return this.format(row);
  }

  static async create({
    id = "usr_" + uuidv4().slice(0, 12),
    name,
    email = null,
    email_verified = 0,
    mobile_number = null,
    mobile_verified = 0,
    google_id = null,
    password_hash = null,
    email_or_mobile = null,
    login_method,
    profile_pic_url = null,
    role = "Computer Science & Engineering (CSE)",
    preferred_language = "en"
  }) {
    const resolvedIdentifier = email_or_mobile || email || mobile_number;
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    await dbRun(
      `INSERT INTO users (
        id, name, email, email_verified, mobile_number, mobile_verified,
        google_id, password_hash, email_or_mobile, login_method, profile_pic_url, role, preferred_language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        normalizedEmail,
        email_verified ? 1 : 0,
        mobile_number,
        mobile_verified ? 1 : 0,
        google_id,
        password_hash,
        resolvedIdentifier,
        login_method,
        profile_pic_url,
        role,
        preferred_language
      ]
    );
    return this.findById(id);
  }

  static async verifyEmail(id) {
    await dbRun("UPDATE users SET email_verified = 1 WHERE id = ?", [id]);
    return this.findById(id);
  }

  static async verifyMobile(id) {
    await dbRun("UPDATE users SET mobile_verified = 1 WHERE id = ?", [id]);
    return this.findById(id);
  }

  static async updatePassword(id, passwordHash) {
    await dbRun("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, id]);
    return this.findById(id);
  }

  static async update(id, fields) {
    const allowed = [
      "name",
      "email",
      "email_verified",
      "mobile_number",
      "mobile_verified",
      "google_id",
      "profile_pic_url",
      "role",
      "preferred_language"
    ];
    const updates = [];
    const values = [];

    // Support camelCase mappings
    if (fields.avatar && !fields.profile_pic_url) fields.profile_pic_url = fields.avatar;
    if (fields.preferredLanguage && !fields.preferred_language) fields.preferred_language = fields.preferredLanguage;
    if (fields.department && !fields.role) fields.role = fields.department;
    if (fields.emailVerified !== undefined && fields.email_verified === undefined) {
      fields.email_verified = fields.emailVerified ? 1 : 0;
    }
    if (fields.mobileVerified !== undefined && fields.mobile_verified === undefined) {
      fields.mobile_verified = fields.mobileVerified ? 1 : 0;
    }

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
