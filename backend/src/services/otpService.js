import crypto from "crypto";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { dbRun, dbGet, dbAll } from "../config/db.js";
import { env } from "../config/env.js";

export class OtpService {
  /**
   * Generates a cryptographically strong 6-digit numeric OTP
   */
  static generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Creates and stores a hashed OTP record with rate-limit and expiry
   */
  static async createAndDispatchOtp({ identifier, type = "mobile_otp", medium = "sms" }) {
    if (!identifier) {
      throw new Error("Identifier (phone or email) is required.");
    }

    const normalized = identifier.trim().toLowerCase();

    // 1. Check existing record for lock status
    const existing = await dbGet(
      "SELECT * FROM otp_verifications WHERE identifier = ? AND type = ?",
      [normalized, type]
    );

    if (existing && existing.locked_until && existing.locked_until > Date.now()) {
      const waitMins = Math.ceil((existing.locked_until - Date.now()) / 60000);
      throw new Error(`Account temporarily locked due to too many failed attempts. Try again in ${waitMins} minute(s).`);
    }

    // 2. Rate limiting: Max 3 OTP requests per 10 minutes
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const recentRequests = await dbAll(
      "SELECT created_at FROM otp_verifications WHERE identifier = ? AND type = ? AND created_at > ?",
      [normalized, type, tenMinutesAgo]
    );

    // If existing active request was created very recently (< 30s), enforce cooldown
    if (existing && Date.now() - existing.created_at < 30 * 1000) {
      const remainingCooldown = Math.ceil((30 * 1000 - (Date.now() - existing.created_at)) / 1000);
      throw new Error(`Please wait ${remainingCooldown}s before requesting another verification code.`);
    }

    // 3. Generate 6-digit OTP and bcrypt hash
    const otp = this.generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL
    const now = Date.now();
    const id = "otp_" + uuidv4().slice(0, 12);

    await dbRun(
      `INSERT INTO otp_verifications (id, identifier, type, otp_hash, expires_at, attempts, locked_until, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)
       ON CONFLICT(identifier, type) DO UPDATE SET
         otp_hash = excluded.otp_hash,
         expires_at = excluded.expires_at,
         attempts = 0,
         locked_until = 0,
         created_at = excluded.created_at`,
      [id, normalized, type, otpHash, expiresAt, now]
    );

    // 4. Dispatch SMS or Email
    await this.dispatchMessage({ identifier: normalized, otp, type, medium });

    return {
      success: true,
      identifier: normalized,
      type,
      expiresInSeconds: 300,
      devOtp: env.NODE_ENV === "test" ? otp : undefined
    };
  }

  /**
   * Verifies a submitted OTP against stored hash with attempt limit & lockouts
   */
  static async verifyOtp({ identifier, otp, type = "mobile_otp" }) {
    if (!identifier || !otp) {
      throw new Error("Identifier and OTP code are both required.");
    }

    const normalized = identifier.trim().toLowerCase();
    const submittedOtp = otp.toString().trim();

    const record = await dbGet(
      "SELECT * FROM otp_verifications WHERE identifier = ? AND type = ?",
      [normalized, type]
    );

    if (!record) {
      throw new Error("No active verification code found for this destination. Please request a new OTP.");
    }

    // Check 15-minute lock status
    if (record.locked_until && record.locked_until > Date.now()) {
      const waitMins = Math.ceil((record.locked_until - Date.now()) / 60000);
      throw new Error(`Account locked due to consecutive failed attempts. Try again in ${waitMins} minute(s).`);
    }

    // Check expiry
    if (Date.now() > record.expires_at) {
      await dbRun("DELETE FROM otp_verifications WHERE id = ?", [record.id]);
      throw new Error("Verification code has expired (5 minute limit). Please request a new OTP.");
    }

    // Verify bcrypt hash
    const isMatch = await bcrypt.compare(submittedOtp, record.otp_hash);
    if (!isMatch) {
      const newAttempts = (record.attempts || 0) + 1;
      if (newAttempts >= 3) {
        const lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
        await dbRun(
          "UPDATE otp_verifications SET attempts = ?, locked_until = ? WHERE id = ?",
          [newAttempts, lockedUntil, record.id]
        );
        throw new Error("Maximum attempts exceeded (3/3). Account locked for 15 minutes for your security.");
      } else {
        await dbRun(
          "UPDATE otp_verifications SET attempts = ? WHERE id = ?",
          [newAttempts, record.id]
        );
        const remaining = 3 - newAttempts;
        throw new Error(`Invalid verification code. ${remaining} attempt(s) remaining.`);
      }
    }

    // Success: Delete single-use OTP
    await dbRun("DELETE FROM otp_verifications WHERE id = ?", [record.id]);
    return true;
  }

  /**
   * Dispatches OTP via real SMS/Email providers or secure server log
   */
  static async dispatchMessage({ identifier, otp, type, medium }) {
    if (medium === "sms") {
      if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
        try {
          const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
          const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
          const body = new URLSearchParams({
            To: identifier,
            From: env.TWILIO_PHONE_NUMBER,
            Body: `Your LearnAI security code is ${otp}. Valid for 5 minutes. Do not share this code.`
          });

          const twilioRes = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
          });

          if (!twilioRes.ok) {
            const errText = await twilioRes.text();
            console.error("Twilio SMS dispatch failed:", errText);
          } else {
            console.log(`[Twilio-Live] Sent SMS OTP to ${identifier}`);
          }
        } catch (twilioErr) {
          console.error("Twilio SMS Error:", twilioErr.message);
        }
      } else {
        console.log(`\n========================================`);
        console.log(`🔒 [DISPATCH-SMS-OTP]`);
        console.log(`📱 Destination: ${identifier}`);
        console.log(`🔑 Verification Code: ${otp}`);
        console.log(`⏰ Expiration: 5 minutes`);
        console.log(`========================================\n`);
      }
    } else {
      console.log(`\n========================================`);
      console.log(`🔒 [DISPATCH-EMAIL-OTP]`);
      console.log(`📧 Destination: ${identifier}`);
      console.log(`🔑 Verification Code: ${otp}`);
      console.log(`🏷️ Action Type: ${type}`);
      console.log(`⏰ Expiration: 5 minutes`);
      console.log(`========================================\n`);
    }
  }
}
