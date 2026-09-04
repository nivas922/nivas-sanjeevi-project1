import path from "path";
import { Book } from "../models/Book.js";
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

      // Extract text content from file
      const extractedText = await StorageService.extractDocumentText(file.path, file.mimetype);

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
        book
      });
    } catch (error) {
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
      return res.status(200).json({
        success: true,
        status: "success",
        book
      });
    } catch (error) {
      next(error);
    }
  }
}
