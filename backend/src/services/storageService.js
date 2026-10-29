import fs from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "../config/env.js";
import { PdfExtractorService } from "./pdfExtractorService.js";
import { DocumentProcessorService } from "./documentProcessorService.js";
import { CloudinaryService } from "./cloudinaryService.js";

export class StorageService {
  /**
   * Computes SHA-256 hash strictly from the file bytes alone.
   */
  static computeFileHash(buffer) {
    if (!buffer || (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array))) {
      throw new Error("Invalid input: computeFileHash requires a non-empty Buffer or Uint8Array.");
    }
    if (buffer.length === 0) {
      throw new Error("Cannot compute hash of empty file bytes.");
    }
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Scopes duplicate detection hash key separately by authenticated user ID.
   */
  static getUserScopedFileKey(userId, fileHash) {
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      throw new Error("User ID is required to scope file hash.");
    }
    if (!fileHash || typeof fileHash !== "string" || fileHash.trim().length === 0) {
      throw new Error("File hash is required to scope file key.");
    }
    return `${userId.trim()}:${fileHash.trim().toLowerCase()}`;
  }

  static getFileUrl(fileName) {
    return `/uploads/${fileName}`;
  }


  static async extractDocumentText(filePath, mimeType) {
    if (!fs.existsSync(filePath)) {
      const err = new Error("Document file not found on server.");
      err.statusCode = 404;
      throw err;
    }

    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".pdf" || mimeType === "application/pdf") {
      const extraction = await PdfExtractorService.extractPagesFromFile(filePath);
      return extraction.fullText;
    }

    if (ext === ".txt") {
      const txt = PdfExtractorService.normalizeText(fs.readFileSync(filePath, "utf-8"));
      if (!txt || txt.trim().length === 0) {
        const err = new Error("This document does not contain extractable text. Please upload a text-based PDF or document.");
        err.statusCode = 400;
        throw err;
      }
      return txt;
    }

    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    if (imageExtensions.includes(ext) || (mimeType && mimeType.startsWith("image/"))) {
      const err = new Error("This file does not contain extractable text. Please upload a text-based PDF.");
      err.statusCode = 400;
      throw err;
    }

    const err = new Error("This document format does not contain extractable text. Please upload a text-based PDF.");
    err.statusCode = 400;
    throw err;
  }

  static async extractDocumentTextFromBuffer(buffer, mimeType, filename = "") {
    if (!buffer || (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array))) {
      const err = new Error("Invalid document buffer provided.");
      err.statusCode = 400;
      throw err;
    }

    const ext = filename ? path.extname(filename).toLowerCase() : "";

    if (ext === ".pdf" || mimeType === "application/pdf") {
      const extraction = await PdfExtractorService.extractPagesFromPdfBuffer(buffer);
      return extraction.fullText;
    }

    if (ext === ".txt" || mimeType === "text/plain") {
      const txt = PdfExtractorService.normalizeText(buffer.toString("utf-8"));
      if (!txt || txt.trim().length === 0) {
        const err = new Error("This document does not contain extractable text. Please upload a text-based PDF or document.");
        err.statusCode = 400;
        throw err;
      }
      return txt;
    }

    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    if (imageExtensions.includes(ext) || (mimeType && mimeType.startsWith("image/"))) {
      const err = new Error("This file does not contain extractable text. Please upload a text-based PDF.");
      err.statusCode = 400;
      throw err;
    }

    const err = new Error("This document format does not contain extractable text. Please upload a text-based PDF.");
    err.statusCode = 400;
    throw err;
  }

  static async processAndStoreDocument({ bookId, filePath, fileBuffer, originalName, mimeType }) {
    return await DocumentProcessorService.processDocument({ bookId, filePath, fileBuffer, originalName, mimeType });
  }

  /**
   * Resolves the Cloudinary resource type for an asset ('image' or 'raw').
   * Evaluates explicit publicId namespace (/image/ vs /raw/), file extensions,
   * and secure URL metadata, falling back to 'raw' for legacy records.
   */
  static resolveCloudinaryResourceType(book) {
    if (!book) return "raw";

    const fileName = book.fileName || book.file_name || "";
    if (fileName.includes("/image/")) return "image";
    if (fileName.includes("/raw/")) return "raw";

    const ext = path.extname(fileName).toLowerCase();
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".pdf"];
    if (imageExtensions.includes(ext)) return "image";

    const url = book.fileUrl || book.file_url || "";
    if (url.includes("/image/")) return "image";
    if (url.includes("/raw/")) return "raw";

    return "raw";
  }

  /**
   * Delivers a book file to an HTTP response.
   * If stored locally, streams from disk with lexical and canonical path containment.
   * If stored in Cloudinary, streams authenticated asset through the server.
   */
  static async deliverBookFile(book, req, res) {
    if (!book) {
      const err = new Error("Book not found.");
      err.statusCode = 404;
      throw err;
    }

    // 1. Check local disk storage
    if (book.fileName) {
      const uploadDir = path.resolve(env.UPLOAD_DIR);
      const localPath = path.resolve(uploadDir, book.fileName);

      // Lexical path containment check: ensure localPath cannot escape configured upload directory
      if (!localPath.startsWith(uploadDir + path.sep)) {
        const securityErr = new Error("Access denied: Invalid or escaping textbook file path.");
        securityErr.statusCode = 403;
        throw securityErr;
      }

      if (fs.existsSync(localPath)) {
        // Canonical containment check: verify realpath does not escape uploadDir (symlink defense)
        try {
          const canonicalLocalPath = fs.realpathSync(localPath);
          const canonicalUploadDir = fs.realpathSync(uploadDir);
          if (!canonicalLocalPath.startsWith(canonicalUploadDir + path.sep)) {
            const securityErr = new Error("Access denied: Symlink or canonical path escapes upload directory.");
            securityErr.statusCode = 403;
            throw securityErr;
          }
        } catch (realErr) {
          if (realErr.statusCode === 403) throw realErr;
          const notFound = new Error("Textbook file not found on disk.");
          notFound.statusCode = 404;
          throw notFound;
        }

        const ext = path.extname(book.fileName).toLowerCase();
        let mimeType = "application/octet-stream";
        if (ext === ".pdf") mimeType = "application/pdf";
        else if (ext === ".txt") mimeType = "text/plain";
        else if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
        else if (ext === ".png") mimeType = "image/png";
        else if (ext === ".webp") mimeType = "image/webp";

        const stat = fs.statSync(localPath);
        const fileSize = stat.size;
        const range = req && req.headers ? req.headers.range : null;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
            res.status(416).setHeader("Content-Range", `bytes */${fileSize}`);
            return res.end();
          }
          const chunksize = end - start + 1;
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": mimeType,
            "Content-Disposition": `inline; filename="${path.basename(book.fileName)}"`
          });
          const stream = fs.createReadStream(localPath, { start, end });
          return new Promise((resolve, reject) => {
            stream.pipe(res);
            stream.on("end", resolve);
            stream.on("error", reject);
          });
        }

        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Length", fileSize);
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Disposition", `inline; filename="${path.basename(book.fileName)}"`);
        const stream = fs.createReadStream(localPath);
        return new Promise((resolve, reject) => {
          stream.pipe(res);
          stream.on("end", resolve);
          stream.on("error", reject);
        });
      }
    }

    // 2. Check authenticated Cloudinary storage if configured
    if (CloudinaryService.isConfigured() && book.fileName) {
      const resourceType = StorageService.resolveCloudinaryResourceType(book);
      return await CloudinaryService.streamAuthenticatedAsset(book.fileName, resourceType, res, book, req);
    }

    const notFoundErr = new Error("Textbook file not found in storage.");
    notFoundErr.statusCode = 404;
    throw notFoundErr;
  }
}


