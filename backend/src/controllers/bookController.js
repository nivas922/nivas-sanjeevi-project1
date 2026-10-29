import fs from "fs";
import path from "path";
import { Book } from "../models/Book.js";
import { DocumentChunk } from "../models/DocumentChunk.js";
import { Progress } from "../models/Progress.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { StorageService } from "../services/storageService.js";
import { CloudinaryService } from "../services/cloudinaryService.js";
import { withTransaction } from "../config/db.js";
import { env } from "../config/env.js";
import { DEFAULT_USER_ID, resolveAuthUserId } from "../middleware/auth.js";

export class BookController {
  // POST /upload-book
  static async uploadBook(req, res, next) {
    let cloudAsset = null;
    const isCloudinaryActive = CloudinaryService.isConfigured() && Boolean(req.file && req.file.buffer);

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No textbook or document file provided. Please upload a PDF, DOC, DOCX, TXT, or image."
        });
      }

      const userId = resolveAuthUserId(req) || DEFAULT_USER_ID;
      const file = req.file;

      // Extract title and subject from request body or filename
      const originalName = file.originalname || "document.pdf";
      const cleanTitle = req.body.title || originalName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
      const subject = req.body.subject || formattedTitle;

      let fileUrl;
      let storedFileName;
      let fileSize = file.size || (file.buffer ? file.buffer.length : 0);
      let processingResult;

      if (isCloudinaryActive) {
        const fileHash = StorageService.computeFileHash(file.buffer);

        // Process in-memory buffer: extract text, detect hierarchy, and generate chunks in ONE operation
        try {
          processingResult = await StorageService.processAndStoreDocument({
            fileBuffer: file.buffer,
            originalName,
            mimeType: file.mimetype
          });
        } catch (procError) {
          return res.status(procError.statusCode || 400).json({
            success: false,
            error: procError.message || "Failed to process and chunk document."
          });
        }

        // Upload buffer directly to Cloudinary as an authenticated asset
        try {
          const stagingTags = (process.env.NODE_ENV === "staging" || process.env.STAGING_VALIDATION_ACTIVE === "true")
            ? ["learnai_staging_test"]
            : [];
          cloudAsset = await CloudinaryService.uploadBuffer({
            buffer: file.buffer,
            userId,
            fileHash,
            originalName,
            mimeType: file.mimetype,
            tags: stagingTags
          });
          storedFileName = cloudAsset.publicId;
          fileUrl = cloudAsset.secureUrl;
        } catch (cloudErr) {
          console.error("❌ [BookController] Cloudinary upload error:", cloudErr.message);
          return res.status(502).json({
            success: false,
            error: "Failed to upload document to cloud storage."
          });
        }
      } else {
        // Local-disk fallback
        storedFileName = file.filename;
        fileUrl = StorageService.getFileUrl(file.filename);

        try {
          processingResult = await StorageService.processAndStoreDocument({
            filePath: file.path,
            mimeType: file.mimetype
          });
        } catch (procError) {
          if (file.path && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch {}
          }
          return res.status(procError.statusCode || 400).json({
            success: false,
            error: procError.message || "Failed to process and chunk document."
          });
        }
      }

      // Persist book, chunks, progress, and activity in an atomic database transaction
      let book;
      try {
        await withTransaction(async () => {
          book = await Book.create({
            user_id: userId,
            file_url: fileUrl,
            title: formattedTitle,
            subject: subject,
            file_name: storedFileName,
            file_size: fileSize,
            extracted_text: processingResult.fullText
          });

          // Persist structured chunks referencing the newly created book
          if (Array.isArray(processingResult.chunks) && processingResult.chunks.length > 0) {
            await DocumentChunk.createMany(
              processingResult.chunks.map((c) => ({
                ...c,
                book_id: book.id,
                bookId: book.id
              }))
            );
          }

          // Update progress: increment books studied count for this subject
          await Progress.incrementBookCount(userId, subject);

          // Log activity
          await ActivityLog.create({
            user_id: userId,
            activity_type: "upload",
            title: `Uploaded '${formattedTitle}'`,
            reference_id: book.id
          });
        });
      } catch (dbError) {
        console.error("❌ [BookController] Transaction failed during book persistence:", dbError.message);
        if (isCloudinaryActive && cloudAsset) {
          try {
            await CloudinaryService.destroyAsset(cloudAsset.publicId, cloudAsset.resourceType);
          } catch (cleanupErr) {
            console.warn("⚠️ [BookController] Cleanup error after DB failure:", cleanupErr.message);
          }
        } else if (file.path && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch {}
        }
        return res.status(500).json({
          success: false,
          error: "Failed to persist document and chunks to database."
        });
      }

      return res.status(201).json({
        success: true,
        status: "success",
        message: "Textbook uploaded successfully.",
        book_id: book.id,
        bookId: book.id,
        book,
        processingStats: {
          chaptersCount: processingResult.chaptersCount,
          sectionsCount: processingResult.sectionsCount,
          totalChunks: processingResult.totalChunks
        }
      });
    } catch (error) {
      if (isCloudinaryActive && cloudAsset) {
        try { await CloudinaryService.destroyAsset(cloudAsset.publicId, cloudAsset.resourceType); } catch {}
      } else if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      next(error);
    }
  }

  // GET /books
  static async getUserBooks(req, res, next) {
    try {
      const authUserId = resolveAuthUserId(req);
      let books;
      if (authUserId && authUserId !== DEFAULT_USER_ID) {
        const userBooks = await Book.findByUserId(authUserId);
        const defaultBooks = await Book.findByUserId(DEFAULT_USER_ID);
        const bookMap = new Map();
        for (const b of [...userBooks, ...defaultBooks]) {
          if (!bookMap.has(b.id)) bookMap.set(b.id, b);
        }
        books = Array.from(bookMap.values());
      } else {
        books = await Book.findByUserId(DEFAULT_USER_ID);
      }
      return res.status(200).json({
        success: true,
        status: "success",
        books
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /books/:id
  static async getBookById(req, res, next) {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ success: false, error: "Book not found." });
      }
      const authUserId = resolveAuthUserId(req) || DEFAULT_USER_ID;
      if (book.user_id && book.user_id !== DEFAULT_USER_ID && authUserId !== book.user_id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to access this textbook."
        });
      }
      return res.status(200).json({
        success: true,
        status: "success",
        book
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /books/:id/chunks (Phase 2 Chunk Access Endpoint)
  static async getBookChunks(req, res, next) {
    try {
      const bookId = req.params.id;
      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ success: false, error: "Book not found." });
      }
      const authUserId = resolveAuthUserId(req) || DEFAULT_USER_ID;
      if (book.user_id && book.user_id !== DEFAULT_USER_ID && authUserId !== book.user_id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to access this textbook."
        });
      }
      const chunks = await DocumentChunk.findByBookId(bookId);
      return res.status(200).json({
        success: true,
        status: "success",
        book_id: bookId,
        totalChunks: chunks.length,
        chunks
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /books/:id/file (Phase 2.2 Scoped File Delivery Endpoint)
  static async getBookFile(req, res, next) {
    try {
      const bookId = req.params.id;
      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ success: false, error: "Book not found." });
      }

      // Authenticated access check: Token MUST be provided and cryptographically valid
      const authUserId = resolveAuthUserId(req);
      if (!authUserId) {
        return res.status(401).json({
          success: false,
          error: "Authentication token required to access textbook file."
        });
      }

      // Fail-closed ownership validation:
      // 1. Missing, null, undefined, or empty owner ID is strictly rejected
      const ownerId = book.user_id ? String(book.user_id).trim() : "";
      if (!ownerId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: Textbook record has invalid or missing owner identification."
        });
      }

      // 2. Default/public catalog books are accessible to authenticated users
      if (ownerId === DEFAULT_USER_ID) {
        // Authenticated user permitted to access public catalog textbook
      } else if (authUserId !== ownerId) {
        // Private book: must match authenticated user exactly
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to access this textbook file."
        });
      }

      await StorageService.deliverBookFile(book, req, res);
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
      }
      next(error);
    }
  }

  // DELETE /books/:id
  static async deleteBook(req, res, next) {
    try {
      const bookId = req.params.id;
      if (!bookId || typeof bookId !== "string" || !bookId.trim()) {
        return res.status(400).json({ success: false, error: "Invalid textbook ID." });
      }

      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ success: false, error: "Textbook not found." });
      }

      // Authorization: only the owner or default catalog user can delete
      const authUserId = resolveAuthUserId(req) || DEFAULT_USER_ID;
      if (book.user_id && book.user_id !== DEFAULT_USER_ID && authUserId !== book.user_id) {
        return res.status(403).json({
          success: false,
          error: "Access denied. You do not have permission to delete this textbook."
        });
      }

      // 1. Delete associated document chunks (preserves unrelated summaries and quizzes)
      await DocumentChunk.deleteByBookId(bookId).catch(() => {});

      // 2. Delete the textbook record
      await Book.deleteById(bookId);

      // 3. Remove physical local file if present on disk
      if (book.fileName) {
        const uploadDir = path.resolve(env.UPLOAD_DIR);
        const localPath = path.resolve(uploadDir, book.fileName);
        if (localPath.startsWith(uploadDir + path.sep) && fs.existsSync(localPath)) {
          try { fs.unlinkSync(localPath); } catch {}
        }
      }

      // 4. Clean up Cloudinary asset if configured
      if (CloudinaryService.isConfigured() && book.fileName) {
        try {
          const resourceType = StorageService.resolveCloudinaryResourceType(book);
          await CloudinaryService.destroyAsset(book.fileName, resourceType);
        } catch {}
      }

      return res.status(200).json({
        success: true,
        status: "success",
        message: `Textbook '${book.title}' deleted successfully.`
      });
    } catch (error) {
      next(error);
    }
  }
}

