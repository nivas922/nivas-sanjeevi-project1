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
      return { pages: [], fullText: "", totalPages: 0 };
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
      const parsed = await pdfParse(pdfBuffer, { pagerender: customPageRender });

      // Sort pages by page number to guarantee structural document order
      pages.sort((a, b) => a.pageNumber - b.pageNumber);

      const parsedCleanText = this.normalizeText(parsed.text || "");

      // If pages array was populated via pagerender callback
      if (pages.length > 0) {
        const fullText = pages.map((p) => p.text).join("\n\n");
        return {
          pages,
          fullText: this.normalizeText(fullText),
          totalPages: parsed.numpages || pages.length
        };
      }

      // Fallback if custom pagerender callback didn't execute for single page
      return {
        pages: [{ pageNumber: 1, text: parsedCleanText }],
        fullText: parsedCleanText,
        totalPages: parsed.numpages || 1
      };
    } catch (err) {
      console.warn("PDF page extraction warning:", err.message);
      return {
        pages: [],
        fullText: "",
        totalPages: 0
      };
    }
  }

  /**
   * Helper to extract pages directly from a file path
   */
  static async extractPagesFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return { pages: [], fullText: "", totalPages: 0 };
    }
    const fileBuffer = fs.readFileSync(filePath);
    return await this.extractPagesFromPdfBuffer(fileBuffer);
  }
}
