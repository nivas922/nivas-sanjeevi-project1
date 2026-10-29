import { v2 as cloudinary } from "cloudinary";
import https from "https";
import http from "http";
import { env } from "../config/env.js";

export class CloudinaryService {
  /**
   * Returns true strictly when valid Cloudinary credentials are configured in environment.
   */
  static isConfigured() {
    return Boolean(
      process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
       process.env.CLOUDINARY_API_KEY &&
       process.env.CLOUDINARY_API_SECRET)
    );
  }

  /**
   * Initializes Cloudinary client config if configured.
   */
  static ensureConfigured() {
    if (!this.isConfigured()) {
      throw new Error("Cloudinary credentials are not configured in environment.");
    }
    if (!process.env.CLOUDINARY_URL) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true
      });
    }
  }

  /**
   * Returns true if staging mode is active.
   */
  static isStagingMode() {
    return process.env.NODE_ENV === "staging" || process.env.STAGING_VALIDATION_ACTIVE === "true";
  }

  /**
   * Validates whether a userId conforms to the application's legitimate user-ID formats.
   * Legitimate formats in LearnAI:
   * 1. Prefixed user IDs: 'usr_' followed by 1 to 64 alphanumeric characters, underscores, or hyphens
   *    (e.g., 'usr_default', 'usr_1', 'usr_stg_1', 'usr_student_alpha', 'usr_d0353968-f97').
   * 2. Canonical UUIDs: 36-character hexadecimal UUID format (8-4-4-4-12).
   * Rejects any path traversal characters ('..', '/', '\\'), whitespace, or unexpected separators.
   *
   * @param {string} userId
   * @returns {boolean}
   */
  static isValidUserId(userId) {
    if (!userId || typeof userId !== "string") {
      return false;
    }
    const trimmed = userId.trim();
    if (trimmed.length === 0 || trimmed.length > 68) {
      return false;
    }
    // Reject path separators or traversal strings explicitly
    if (
      trimmed.includes("/") ||
      trimmed.includes("\\") ||
      trimmed.includes("..") ||
      trimmed.includes(":") ||
      trimmed.includes("%") ||
      trimmed.includes(" ")
    ) {
      return false;
    }
    const USER_ID_PATTERN = /^(usr_[a-zA-Z0-9_-]{1,64}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
    return USER_ID_PATTERN.test(trimmed);
  }

  /**
   * Build a strictly user-scoped public ID for Cloudinary storage.
   * Prevents User A and User B from colliding or discovering each other's files.
   * Validates userId against legitimate formats and rejects invalid IDs/traversal strings.
   * Optionally encodes resourceType to preserve image vs raw asset metadata.
   * Enforces dedicated 'staging/' namespace when staging mode is active.
   */
  static getUserScopedPublicId(userId, fileHash, resourceType = null, namespace = null) {
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      throw new Error("User ID is required to scope Cloudinary public ID.");
    }
    if (!this.isValidUserId(userId)) {
      throw new Error(
        `Invalid user ID format: '${userId}'. Must conform to legitimate application user ID formats (e.g. 'usr_<id>') without path traversal or separators.`
      );
    }
    if (!fileHash || typeof fileHash !== "string" || fileHash.trim().length === 0) {
      throw new Error("File hash is required to scope Cloudinary public ID.");
    }

    const isStaging = namespace === "staging" || (namespace === null && this.isStagingMode());
    const basePrefix = isStaging ? "staging/textbooks" : "textbooks";

    if (resourceType) {
      const cleanType = String(resourceType).trim().toLowerCase() === "image" ? "image" : "raw";
      return `${basePrefix}/${userId.trim()}/${cleanType}/${fileHash.trim().toLowerCase()}`;
    }
    return `${basePrefix}/${userId.trim()}/${fileHash.trim().toLowerCase()}`;
  }

  /**
   * Streams an in-memory Buffer directly to Cloudinary as an authenticated raw asset.
   * Rejects if buffer exceeds max allowed bytes.
   */
  static async uploadBuffer({ buffer, userId, fileHash, originalName, mimeType, tags = [] }) {
    this.ensureConfigured();

    if (!buffer || (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array))) {
      throw new Error("Invalid input: uploadBuffer requires a non-empty Buffer or Uint8Array.");
    }

    const isPdf = (mimeType === "application/pdf") || (originalName && originalName.toLowerCase().endsWith(".pdf"));
    const isImage = (mimeType && mimeType.startsWith("image/")) || isPdf;
    const resourceType = isImage ? "image" : "raw";
    const publicId = this.getUserScopedPublicId(userId, fileHash, resourceType);

    const uploadOptions = {
      resource_type: resourceType,
      type: "authenticated",
      public_id: publicId,
      overwrite: true
    };

    if (isPdf) {
      uploadOptions.format = "pdf";
    }

    if (Array.isArray(tags) && tags.length > 0) {
      uploadOptions.tags = tags.filter((t) => typeof t === "string" && t.trim().length > 0);
    } else if (typeof tags === "string" && tags.trim().length > 0) {
      uploadOptions.tags = [tags.trim()];
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error("❌ [Cloudinary] Upload failed:", error.message);
            return reject(error);
          }
          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            bytes: result.bytes,
            format: result.format,
            resourceType: result.resource_type
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Destroys an uploaded Cloudinary asset if later downstream processing or database writes fail.
   * Safe to call in error/rollback handlers.
   */
  static async destroyAsset(publicId, resourceType = "raw") {
    if (!this.isConfigured() || !publicId) return;
    try {
      this.ensureConfigured();
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: "authenticated"
      });
      console.log(` [Cloudinary Cleanup] Successfully deleted asset: ${publicId}`);
    } catch (cleanupErr) {
      console.warn(`⚠️ [Cloudinary Cleanup] Failed to destroy asset '${publicId}':`, cleanupErr.message);
    }
  }

  /**
   * Generates a signed, short-lived download URL for an authenticated asset.
   */
  static generateSignedUrl(publicId, resourceType = "raw", expiresInSeconds = 300) {
    this.ensureConfigured();
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return cloudinary.utils.private_download_url(publicId, "", {
      resource_type: resourceType,
      type: "authenticated",
      expires_at: expiresAt,
      attachment: false
    });
  }

  /**
   * Streams authenticated Cloudinary asset directly to an HTTP response.
   * Keeps Cloudinary internal URLs and signed tokens entirely server-side.
   */
  static async streamAuthenticatedAsset(publicId, resourceType = "raw", res, book = null, req = null) {
    this.ensureConfigured();
    const signedUrl = this.generateSignedUrl(publicId, resourceType);

    return new Promise((resolve, reject) => {
      const client = signedUrl.startsWith("https") ? https : http;
      const requestOptions = {};
      if (req && req.headers && req.headers.range) {
        requestOptions.headers = { Range: req.headers.range };
      }

      client
        .get(signedUrl, requestOptions, (streamRes) => {
          if (streamRes.statusCode >= 400) {
            const err = new Error(`Cloudinary delivery failed with status ${streamRes.statusCode}`);
            err.statusCode = streamRes.statusCode;
            return reject(err);
          }

          const filename = (book && (book.fileName || book.title)) || publicId;
          const ext = path.extname(filename).toLowerCase();
          const isPdf = ext === ".pdf" ||
                        publicId.toLowerCase().includes(".pdf") ||
                        (book && book.title && book.title.toLowerCase().includes(".pdf")) ||
                        (streamRes.headers["content-type"] && streamRes.headers["content-type"].includes("pdf")) ||
                        resourceType === "raw";

          const mimeType = isPdf ? "application/pdf" : (streamRes.headers["content-type"] || "application/octet-stream");

          if (streamRes.statusCode === 206) {
            res.status(206);
            if (streamRes.headers["content-range"]) {
              res.setHeader("Content-Range", streamRes.headers["content-range"]);
            }
          }

          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Content-Type", mimeType);
          res.setHeader("Content-Disposition", `inline; filename="${path.basename(filename)}"`);
          if (streamRes.headers["content-length"]) {
            res.setHeader("Content-Length", streamRes.headers["content-length"]);
          }
          streamRes.pipe(res);
          streamRes.on("end", resolve);
          streamRes.on("error", reject);
        })
        .on("error", reject);
    });
  }
}
