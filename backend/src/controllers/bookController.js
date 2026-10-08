import fs from "fs";
import path from "path";
import { Book } from "../models/Book.js";
import { DocumentChunk } from "../models/DocumentChunk.js";
import { Progress } from "../models/Progress.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { StorageService } from "../services/storageService.js";

export class BookController {
  // POST /upload-book
  static async uploadBook(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No textbook or document file provided. Please upload a PDF, DOC, DOCX, TXT, or image."
        });
      }

      const userId = req.userId;
      const file = req.file;
      const fileUrl = StorageService.getFileUrl(file.filename);

      // Extract title and subject from request body or filename
      const originalName = file.originalname;
      const cleanTitle = req.body.title || originalName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
      const subject = req.body.subject || formattedTitle;

      // Extract raw text content from file
      let extractedText;
      try {
        extractedText = await StorageService.extractDocumentText(file.path, file.mimetype);
      } catch (extractError) {
        if (fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch {}
        }
        return res.status(extractError.statusCode || 400).json({
          success: false,
          error: extractError.message || "Failed to extract text from document."
        });
      }

      // Create book in database
      const book = await Book.create({
        user_id: userId,
        file_url: fileUrl,
        title: formattedTitle,
        subject: subject,
        file_name: file.filename,
        file_size: file.size,
        extracted_text: extractedText
      });

      // Phase 2: Run structured extraction, chapter detection, and text chunking
      let processingResult;
      try {
        processingResult = await StorageService.processAndStoreDocument({
          bookId: book.id,
          filePath: file.path,
          mimeType: file.mimetype
        });
      } catch (procError) {
        if (fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch {}
        }
        await Book.deleteById(book.id);
        return res.status(procError.statusCode || 400).json({
          success: false,
          error: procError.message || "Failed to process and chunk document."
        });
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
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      next(error);
    }
  }

  // GET /books
  static async getUserBooks(req, res, next) {
    try {
      const books = await Book.findByUserId(req.userId);
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
      if (book.user_id && req.userId && book.user_id !== req.userId) {
        return res.status(403).json({ success: false, error: "You do not have authorization to access this textbook." });
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
      if (book.user_id && req.userId && book.user_id !== req.userId) {
        return res.status(403).json({ success: false, error: "You do not have authorization to access this textbook's chunks." });
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
}

