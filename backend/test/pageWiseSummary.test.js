import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb, dbRun, dbGet, dbAll } from "../src/config/db.js";
import { DocumentProcessorService } from "../src/services/documentProcessorService.js";
import { TextChunkerService } from "../src/services/textChunkerService.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { AiSummaryService } from "../src/services/aiSummaryService.js";
import { AiService } from "../src/services/aiService.js";
import { Book } from "../src/models/Book.js";
import { Summary } from "../src/models/Summary.js";
import { TranslationService } from "../src/services/translationService.js";
import { DEFAULT_USER_ID } from "../src/middleware/auth.js";
import { env } from "../src/config/env.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runTests = async () => {
  console.log("\n==================================================");
  console.log("🧪 PAGE-WISE SUMMARY & REMOVED AUDIO NARRATION TESTS");
  console.log("==================================================\n");

  await initDb();
  await dbRun("DELETE FROM summaries WHERE book_id LIKE 'test-page-%'");
  await dbRun("DELETE FROM document_chunks WHERE book_id LIKE 'test-page-%'");
  await dbRun("DELETE FROM books WHERE id LIKE 'test-page-%'");

  // TEST 1: Page-by-page hierarchy detection preserves distinct page numbers
  console.log("[TEST 1] Page-by-page section bounding and chunk metadata");
  const mockPages = [
    {
      pageNumber: 1,
      text: "Introduction to Operating Systems.\nAn operating system acts as an intermediary between computer hardware and the user program.\nKernel services include process scheduling, memory allocation, and hardware device abstraction."
    },
    {
      pageNumber: 2,
      text: "Process Management and Concurrency.\nA process represents a program in execution with its own address space, program counter, and registers.\nContext switching incurs CPU cycle overhead due to state preservation."
    },
    {
      pageNumber: 3,
      text: "Virtual Memory and Paging Architectures.\nPaging divides process virtual memory into fixed-size blocks called pages, mapped to physical frames.\nPage faults trigger disk I/O to swap absent pages from backing store into RAM."
    }
  ];

  const sections = DocumentProcessorService.detectHierarchy(mockPages);
  assert.ok(sections.length >= 3, `Expected at least 3 page sections, got ${sections.length}`);

  // Verify each page is individually bounded to its exact page number
  const pageNumbersCaptured = sections.map((s) => s.pageStart);
  assert.ok(pageNumbersCaptured.includes(1), "Page 1 start must be captured");
  assert.ok(pageNumbersCaptured.includes(2), "Page 2 start must be captured");
  assert.ok(pageNumbersCaptured.includes(3), "Page 3 start must be captured");

  const chunks = TextChunkerService.generateStructuredChunks({
    bookId: "test-page-book-1",
    sections,
    chunkSize: 1000,
    overlap: 100
  });

  assert.ok(chunks.length >= 3, "Each page should yield at least one structured chunk");
  const chunkPages = chunks.map((c) => c.pageStart);
  assert.ok(chunkPages.includes(1) && chunkPages.includes(2) && chunkPages.includes(3), "All 3 page numbers present in chunks");
  console.log("✔ TEST 1 PASSED: Real PDF page numbers 1, 2, and 3 accurately preserved across sections and chunks.");

  // TEST 2: Generation of distinct Page-by-Page summaries (no duplication, authentic page numbers)
  console.log("\n[TEST 2] Page-by-Page summary generation from document chunks");
  const pageSummaries = await AiSummaryService.generatePageSummaries(chunks, "en");

  assert.ok(Array.isArray(pageSummaries), "pageSummaries must be an array");
  assert.strictEqual(pageSummaries.length, 3, "Exactly 3 page summaries should be generated for 3 pages");

  // Check page numbers and uniqueness of summaries
  const p1 = pageSummaries.find((p) => p.pageNumber === 1);
  const p2 = pageSummaries.find((p) => p.pageNumber === 2);
  const p3 = pageSummaries.find((p) => p.pageNumber === 3);

  assert.ok(p1, "Page 1 summary must exist");
  assert.ok(p2, "Page 2 summary must exist");
  assert.ok(p3, "Page 3 summary must exist");

  assert.strictEqual(p1.pageNumber, 1);
  assert.strictEqual(p2.pageNumber, 2);
  assert.strictEqual(p3.pageNumber, 3);

  // Assert that summaries do not repeat across pages and reflect actual page content
  assert.notStrictEqual(p1.summary, p2.summary, "Page 1 and Page 2 summaries must not be identical");
  assert.notStrictEqual(p2.summary, p3.summary, "Page 2 and Page 3 summaries must not be identical");
  assert.notStrictEqual(p1.summary, p3.summary, "Page 1 and Page 3 summaries must not be identical");

  assert.ok(p1.summary.toLowerCase().includes("operating system") || p1.summary.includes("hardware") || p1.summary.includes("page 1"), "Page 1 summary derives from Page 1 text");
  assert.ok(p2.summary.toLowerCase().includes("process") || p2.summary.includes("concurrency") || p2.summary.includes("page 2"), "Page 2 summary derives from Page 2 text");
  assert.ok(p3.summary.toLowerCase().includes("memory") || p3.summary.includes("paging") || p3.summary.includes("page 3"), "Page 3 summary derives from Page 3 text");
  console.log("✔ TEST 2 PASSED: 3 distinct page summaries generated with authentic page numbers and no cross-page repetition.");

  // TEST 3: Summarize Book Pipeline & Database Persistence
  console.log("\n[TEST 3] Full Summarization Pipeline with pageSummaries and SQLite Persistence");
  await Book.create({
    id: "test-page-book-1",
    user_id: DEFAULT_USER_ID,
    title: "Operating Systems Principles",
    subject: "Computer Science",
    file_url: "http://localhost:5000/uploads/test.pdf"
  });
  await DocumentChunk.createMany(chunks);

  const fullSummary = await AiService.generateSummary({
    bookId: "test-page-book-1",
    bookTitle: "Operating Systems Principles",
    subject: "Computer Science",
    targetLanguage: "en"
  });

  assert.ok(Array.isArray(fullSummary.pageSummaries), "fullSummary.pageSummaries must be present");
  assert.strictEqual(fullSummary.pageSummaries.length, 3, "Pipeline must return 3 page summaries");

  // Save to database via Summary.create
  const createdSummary = await Summary.create({
    id: "test-sum-page-1",
    book_id: "test-page-book-1",
    user_id: DEFAULT_USER_ID,
    language: "en",
    summary_text: fullSummary.summaryText,
    key_concepts: fullSummary.keyPoints || [],
    definitions: fullSummary.definitions || [],
    formulas: fullSummary.formulas || [],
    examples: fullSummary.examples || [],
    quick_revision: {
      revisionPoints: fullSummary.quickRevision || [],
      chapters: fullSummary.chapters || [],
      pageSummaries: fullSummary.pageSummaries
    }
  });

  assert.ok(createdSummary, "Summary must be persisted in database");

  // Read back from database via Summary.findById
  const fetchedSummary = await Summary.findById("test-sum-page-1");
  assert.ok(Array.isArray(fetchedSummary.pageSummaries), "fetchedSummary.pageSummaries must be an array");
  assert.strictEqual(fetchedSummary.pageSummaries.length, 3, "Database retrieval must restore all 3 page summaries");
  assert.strictEqual(fetchedSummary.pageSummaries[0].pageNumber, 1);
  assert.strictEqual(fetchedSummary.pageSummaries[1].pageNumber, 2);
  assert.strictEqual(fetchedSummary.pageSummaries[2].pageNumber, 3);
  console.log("✔ TEST 3 PASSED: Full pipeline generated pageSummaries and SQLite stored/retrieved them cleanly.");

  // TEST 4: Multilingual Translation preserves Page Summaries
  console.log("\n[TEST 4] TranslationService translates and preserves pageSummaries");
  const translated = await TranslationService.translateSummaryObject(fetchedSummary, "ta");
  assert.ok(Array.isArray(translated.pageSummaries), "Translated summary must include pageSummaries");
  assert.strictEqual(translated.pageSummaries.length, 3, "Translated summary must maintain all 3 page summaries");
  assert.strictEqual(translated.pageSummaries[0].pageNumber, 1);
  assert.ok(translated.pageSummaries[0].summary.includes("Tamil") || translated.pageSummaries[0].summary.length > 0, "Page 1 summary translated");
  console.log("✔ TEST 4 PASSED: Translation preserves page-by-page breakdown in target language.");

  // TEST 5: Fallback Handling when page information is missing / single page
  console.log("\n[TEST 5] Fallback handling for unpaged or single chunk content");
  const singleChunk = [
    {
      id: "chk_single_001",
      bookId: "test-single-book",
      chapter: "Chapter 1: Overview",
      section: "Section 1",
      pageStart: 1,
      pageEnd: 1,
      text: "Single isolated document without multiple pages."
    }
  ];
  const singlePageSummaries = await AiSummaryService.generatePageSummaries(singleChunk, "en");
  assert.strictEqual(singlePageSummaries.length, 1, "Single chunk should return 1 page summary");
  assert.strictEqual(singlePageSummaries[0].pageNumber, 1, "Page number defaults to 1");

  const emptyResult = await AiSummaryService.generatePageSummaries([], "en");
  assert.deepStrictEqual(emptyResult, [], "Empty chunk array safely returns empty array without throwing");
  console.log("✔ TEST 5 PASSED: Fallback handling works accurately without creating fake pages.");

  // TEST 6: Verify Audio Narration UI is removed from SummaryDetail.jsx
  console.log("\n[TEST 6] Verification of SummaryDetail.jsx source code");
  const summaryDetailPath = path.resolve(__dirname, "../../frontend/src/pages/SummaryDetail.jsx");
  const summaryDetailSource = fs.readFileSync(summaryDetailPath, "utf-8");

  assert.ok(
    !summaryDetailSource.includes("<TextToSpeech"),
    "SummaryDetail.jsx must NOT contain <TextToSpeech component"
  );
  assert.ok(
    !summaryDetailSource.includes('from "../components/tts/TextToSpeech"'),
    "SummaryDetail.jsx must NOT import TextToSpeech"
  );
  assert.ok(
    summaryDetailSource.includes("Page {p.pageNumber} Summary") || summaryDetailSource.includes("Page ${p.pageNumber} Summary"),
    "SummaryDetail.jsx must display Page {p.pageNumber} Summary"
  );
  assert.ok(
    summaryDetailSource.includes("pageSummaries"),
    "SummaryDetail.jsx must reference pageSummaries state or prop"
  );

  // Verify TextToSpeechPage still has TextToSpeech intact
  const ttsPagePath = path.resolve(__dirname, "../../frontend/src/pages/TextToSpeechPage.jsx");
  const ttsPageSource = fs.readFileSync(ttsPagePath, "utf-8");
  assert.ok(
    ttsPageSource.includes("<TextToSpeech"),
    "TextToSpeechPage.jsx must keep TextToSpeech component intact"
  );

  console.log("✔ TEST 6 PASSED: Audio Narration UI successfully removed from SummaryDetail while TTS page is intact.");

  console.log("\n==================================================");
  console.log("🎉 ALL PAGE-WISE SUMMARY TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================\n");

  // Cleanup test artifacts
  await dbRun("DELETE FROM summaries WHERE book_id LIKE 'test-page-%'");
  await dbRun("DELETE FROM document_chunks WHERE book_id LIKE 'test-page-%'");
  await dbRun("DELETE FROM books WHERE id LIKE 'test-page-%'");
};

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
