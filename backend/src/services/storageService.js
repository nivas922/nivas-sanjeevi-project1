import fs from "fs";
import path from "path";
import { env } from "../config/env.js";
import { PdfExtractorService } from "./pdfExtractorService.js";
import { DocumentProcessorService } from "./documentProcessorService.js";

export class StorageService {
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

  static async processAndStoreDocument({ bookId, filePath, mimeType }) {
    return await DocumentProcessorService.processDocument({ bookId, filePath, mimeType });
  }
}

