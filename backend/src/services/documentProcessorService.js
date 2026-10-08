import fs from "fs";
import path from "path";
import { PdfExtractorService } from "./pdfExtractorService.js";
import { TextChunkerService, CHUNK_CONFIG } from "./textChunkerService.js";
import { DocumentChunk } from "../models/DocumentChunk.js";

export class DocumentProcessorService {
  /**
   * Chapter heading regex heuristics
   */
  static isChapterHeading(line) {
    if (!line || typeof line !== "string") return null;
    const clean = line.trim();
    if (clean.length === 0 || clean.length > 80) return null;

    // Patterns like "CHAPTER 1", "Chapter 1: Introduction", "CHAPTER ONE", "Module 1", "Unit 1", "Section 1"
    const chapPattern1 = /^(CHAPTER|Chapter|MODULE|Module|UNIT|Unit|SECTION|Section)\s+([0-9]+|[IVXLCDM]+)([\s:.\-–—]+(.*))?$/i;
    if (chapPattern1.test(clean)) {
      return clean;
    }

    // Patterns like "1. Introduction to Networks" (only single digit index followed by period and title)
    const chapPattern2 = /^([0-9]{1,2})\.\s+([A-Z0-9\s\-_:,\(\)]{3,60})$/;
    if (chapPattern2.test(clean) && !clean.includes(".1") && !clean.includes(".2")) {
      return clean;
    }

    return null;
  }

  /**
   * Section heading regex heuristics
   */
  static isSectionHeading(line) {
    if (!line || typeof line !== "string") return null;
    const clean = line.trim();
    if (clean.length === 0 || clean.length > 80) return null;

    // Patterns like "1.1 Introduction", "1.2.3 Architecture"
    const secPattern1 = /^([0-9]{1,2}\.[0-9]{1,2}(\.[0-9]{1,2})?)\s+([A-Za-z0-9\s\-_:,\(\)]{2,60})$/;
    if (secPattern1.test(clean)) {
      return clean;
    }

    // Patterns like "A. Overview", "B. Implementation"
    const secPattern2 = /^[A-Z]\.\s+([A-Za-z0-9\s\-_:,\(\)]{3,60})$/;
    if (secPattern2.test(clean)) {
      return clean;
    }

    return null;
  }

  /**
   * Parses pages array into structured hierarchical sections (Chapters -> Sections)
   */
  static detectHierarchy(pages) {
    if (!Array.isArray(pages) || pages.length === 0) {
      return [];
    }

    const sections = [];
    let currentChapter = null;
    let currentSection = null;

    let activeChapterTitle = "Chapter 1: Full Document";
    let activeSectionTitle = "Section 1: General Content";
    let activePageStart = pages[0].pageNumber;
    let activePageEnd = pages[0].pageNumber;
    let currentTextBuffer = [];

    let detectedChapterCount = 0;

    for (const page of pages) {
      const pageNum = page.pageNumber;
      const lines = (page.text || "").split("\n");

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.length === 0) continue;

        const chapterMatch = this.isChapterHeading(line);
        if (chapterMatch) {
          // Flush current section text buffer
          if (currentTextBuffer.length > 0) {
            sections.push({
              chapterTitle: activeChapterTitle,
              sectionTitle: activeSectionTitle,
              pageStart: activePageStart,
              pageEnd: activePageEnd,
              text: currentTextBuffer.join("\n\n")
            });
            currentTextBuffer = [];
          }

          detectedChapterCount++;
          activeChapterTitle = chapterMatch;
          activeSectionTitle = "1.1 Introduction";
          activePageStart = pageNum;
          activePageEnd = pageNum;
          continue;
        }

        const sectionMatch = this.isSectionHeading(line);
        if (sectionMatch) {
          if (currentTextBuffer.length > 0) {
            sections.push({
              chapterTitle: activeChapterTitle,
              sectionTitle: activeSectionTitle,
              pageStart: activePageStart,
              pageEnd: activePageEnd,
              text: currentTextBuffer.join("\n\n")
            });
            currentTextBuffer = [];
          }

          activeSectionTitle = sectionMatch;
          activePageStart = pageNum;
          activePageEnd = pageNum;
          continue;
        }

        // Regular line content
        currentTextBuffer.push(line);
        activePageEnd = pageNum;
      }
    }

    // Flush remaining text
    if (currentTextBuffer.length > 0) {
      sections.push({
        chapterTitle: activeChapterTitle,
        sectionTitle: activeSectionTitle,
        pageStart: activePageStart,
        pageEnd: activePageEnd,
        text: currentTextBuffer.join("\n\n")
      });
    }

    // Fallback: If no text was captured in heading loops, combine raw page text
    if (sections.length === 0) {
      const validPages = pages.filter((p) => p.text && p.text.trim().length > 0);
      if (validPages.length === 0) {
        return [];
      }
      const combinedText = validPages.map((p) => p.text).join("\n\n");
      return [
        {
          chapterTitle: "Chapter 1: Full Document",
          sectionTitle: "Section 1: General Content",
          pageStart: validPages[0]?.pageNumber || 1,
          pageEnd: validPages[validPages.length - 1]?.pageNumber || 1,
          text: combinedText
        }
      ];
    }

    return sections;
  }

  /**
   * Main pipeline orchestrator:
   * extract -> normalize -> detect chapters & sections -> chunk -> store in SQLite
   */
  static async processDocument({
    bookId,
    filePath,
    mimeType,
    chunkSize = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE,
    overlap = CHUNK_CONFIG.DEFAULT_CHUNK_OVERLAP
  }) {
    if (!filePath || !fs.existsSync(filePath)) {
      const err = new Error("Document file does not exist on disk.");
      err.statusCode = 404;
      throw err;
    }

    let extractionResult = { pages: [], fullText: "", totalPages: 0 };

    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".pdf" || mimeType === "application/pdf") {
      extractionResult = await PdfExtractorService.extractPagesFromFile(filePath);
    } else if (ext === ".txt") {
      const txtContent = PdfExtractorService.normalizeText(fs.readFileSync(filePath, "utf-8"));
      if (!txtContent || txtContent.trim().length === 0) {
        const err = new Error("This document does not contain extractable text. Please upload a text-based document.");
        err.statusCode = 400;
        throw err;
      }
      extractionResult = {
        pages: [{ pageNumber: 1, text: txtContent }],
        fullText: txtContent,
        totalPages: 1
      };
    } else {
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

    const pages = extractionResult.pages;
    const fullText = extractionResult.fullText;

    if (!fullText || fullText.trim().length === 0) {
      const err = new Error("This PDF does not contain extractable text. Please upload a text-based PDF.");
      err.statusCode = 400;
      throw err;
    }

    // Detect chapters and sections
    const rawSections = this.detectHierarchy(pages);
    const sections = rawSections.filter((s) => s.text && s.text.trim().length > 0);

    if (sections.length === 0) {
      const err = new Error("This PDF does not contain extractable text. Please upload a text-based PDF.");
      err.statusCode = 400;
      throw err;
    }

    // Count unique chapters and total sections
    const chapterSet = new Set(sections.map((s) => s.chapterTitle));
    const chaptersCount = chapterSet.size;
    const sectionsCount = sections.length;

    // Generate structured chunks
    const structuredChunks = TextChunkerService.generateStructuredChunks({
      bookId,
      sections,
      chunkSize,
      overlap
    });

    if (structuredChunks.length === 0) {
      const err = new Error("This PDF does not contain extractable text. Please upload a text-based PDF.");
      err.statusCode = 400;
      throw err;
    }

    // Store in SQLite database if bookId is provided
    let savedChunks = structuredChunks;
    if (bookId) {
      await DocumentChunk.deleteByBookId(bookId);
      savedChunks = await DocumentChunk.createMany(structuredChunks);
    }

    return {
      success: true,
      chaptersCount,
      sectionsCount,
      totalChunks: savedChunks.length,
      fullText,
      chunks: savedChunks
    };
  }
}
