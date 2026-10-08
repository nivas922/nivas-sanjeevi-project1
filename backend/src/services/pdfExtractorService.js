import fs from "fs";
import pdfParse from "pdf-parse";

export class PdfExtractorService {
  /**
   * Normalizes extracted text:
   * - Converts CRLF to LF
   * - Collapses multiple spaces/tabs to a single space
   * - Normalizes 3+ consecutive newlines to 2 newlines (preserving paragraph breaks)
   * - Trims edge whitespace
   */
  static normalizeText(text) {
    if (!text || typeof text !== "string") return "";
    return text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Page-by-page PDF text extraction
   */
  static async extractPagesFromPdfBuffer(pdfBuffer) {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      const err = new Error("Empty PDF buffer provided. Please upload a valid PDF document.");
      err.statusCode = 400;
      throw err;
    }

    // Ensure clean unpooled Uint8Array so pdf.js internal lexer parses from byte offset 0
    let cleanBuffer = pdfBuffer;
    if (pdfBuffer.buffer && (pdfBuffer.byteOffset !== 0 || pdfBuffer.byteLength !== pdfBuffer.buffer.byteLength)) {
      cleanBuffer = new Uint8Array(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength));
    }

    const pages = [];

    // Custom pagerender callback for pdf-parse to capture individual page text & numbers
    function customPageRender(pageData) {
      return pageData.getTextContent().then((textContent) => {
        let lastY, pageText = "";
        for (const item of textContent.items) {
          if (lastY === item.transform[5] || !lastY) {
            pageText += item.str;
          } else {
            pageText += "\n" + item.str;
          }
          lastY = item.transform[5];
        }

        const pageNum = pageData.pageIndex + 1;
        const clean = PdfExtractorService.normalizeText(pageText);

        // Safe handling of empty pages: only store non-empty pages
        if (clean.length > 0) {
          pages.push({
            pageNumber: pageNum,
            text: clean
          });
        }
        return pageText;
      });
    }

    try {
      const parsed = await pdfParse(cleanBuffer, { pagerender: customPageRender });

      // Sort pages by page number to guarantee structural document order
      pages.sort((a, b) => a.pageNumber - b.pageNumber);

      const parsedCleanText = this.normalizeText(parsed.text || "");

      let fullText = "";
      if (pages.length > 0) {
        fullText = this.normalizeText(pages.map((p) => p.text).join("\n\n"));
      } else if (parsedCleanText.length > 0) {
        pages.push({ pageNumber: 1, text: parsedCleanText });
        fullText = parsedCleanText;
      }

      // If document contains no extractable text (e.g. scanned/image PDF without OCR)
      if (!fullText || fullText.trim().length === 0) {
        const noTextErr = new Error("This PDF does not contain extractable text. Please upload a text-based PDF.");
        noTextErr.statusCode = 400;
        throw noTextErr;
      }

      return {
        pages,
        fullText,
        totalPages: parsed.numpages || pages.length || 1
      };
    } catch (err) {
      if (err.statusCode) {
        throw err;
      }
      const parseErr = new Error("Invalid or corrupt PDF file. Please upload a valid PDF document.");
      parseErr.statusCode = 400;
      throw parseErr;
    }
  }

  /**
   * Helper to extract pages directly from a file path
   */
  static async extractPagesFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      const notFoundErr = new Error("PDF file not found on disk.");
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }
    const fileBuffer = fs.readFileSync(filePath);
    return await this.extractPagesFromPdfBuffer(fileBuffer);
  }
}
