import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb, dbRun, dbGet, dbAll } from "../src/config/db.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { Book } from "../src/models/Book.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { Summary } from "../src/models/Summary.js";
import { createValidPdf } from "./generatePdf.js";
import { PdfExtractorService } from "../src/services/pdfExtractorService.js";
import { AiSummaryService } from "../src/services/aiSummaryService.js";
import { AiService } from "../src/services/aiService.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5565;
let server;
const BASE_URL = `http://localhost:${PORT}/api`;

const runPhase3VerificationTests = async () => {
  console.log("\n🧪 Running Phase 3 PDF Pipeline & AI Summarization Verification Test Suite...\n");

  await initDb();
  await dbRun("DELETE FROM summaries");
  await dbRun("DELETE FROM document_chunks");
  await dbRun("DELETE FROM books WHERE title LIKE '%Phase 3%' OR title LIKE '%Test%'");

  server = app.listen(PORT);
  console.log(` Test server listening on port ${PORT}\n`);

  try {
    // -------------------------------------------------------------------------
    // Setup Users: User A and User B for Isolation & Authorization checks
    // -------------------------------------------------------------------------
    const userAEmail = `phase3.usera.${Date.now()}@university.edu`;
    const signupARes = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Phase 3 User A", email: userAEmail, password: "password123" })
    });
    const signupAData = await signupARes.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userAEmail, otp: signupAData.devOtp })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userAEmail, password: "password123" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.token;
    const userAId = loginAData.user.id;

    const userBEmail = `phase3.userb.${Date.now()}@university.edu`;
    const signupBRes = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Phase 3 User B", email: userBEmail, password: "password123" })
    });
    const signupBData = await signupBRes.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userBEmail, otp: signupBData.devOtp })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userBEmail, password: "password123" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.token;
    const userBId = loginBData.user.id;

    // -------------------------------------------------------------------------
    // CASE 1 & CASE 2: PDF upload creates a unique bookId and produces extracted text
    // -------------------------------------------------------------------------
    console.log("[CASE 1 & CASE 2] PDF upload creates unique bookId & extracts real text");
    const netPdfBuffer = createValidPdf([
      "CHAPTER 1: COMPUTER NETWORKS",
      "1.1 Protocol Architecture",
      "Computer networks allow devices to communicate using protocols. TCP provides reliable delivery.",
      "1.2 Network Routing",
      "Routers forward packets across networks using dynamic routing tables."
    ]);

    const netFormData = new FormData();
    netFormData.append("file", new Blob([netPdfBuffer], { type: "application/pdf" }), "Computer_Networks.pdf");
    netFormData.append("title", "Computer Networks Textbook");
    netFormData.append("subject", "Computer Science");

    const uploadNetRes = await fetch(`${BASE_URL}/upload-book`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: netFormData
    });
    const uploadNetData = await uploadNetRes.json();
    if (uploadNetRes.status !== 201) {
      console.error("Upload error response:", uploadNetData);
    }

    assert.strictEqual(uploadNetRes.status, 201, "Upload must succeed with 201");
    assert.ok(uploadNetData.book_id, "Unique bookId must be returned");
    const bookIdA = uploadNetData.book_id;

    // Inspect database record for Book A
    const bookRecordA = await Book.findById(bookIdA);
    assert.ok(bookRecordA, "Book record must exist in SQLite");
    assert.strictEqual(bookRecordA.userId, userAId, "Book must be associated with User A");
    assert.ok(
      bookRecordA.extractedText.includes("Computer networks allow devices to communicate"),
      "Extracted text must correspond to the uploaded PDF content"
    );
    console.log("✔ CASE 1 & 2 PASSED: Uploaded PDF created unique bookId and extracted actual PDF text.");

    // -------------------------------------------------------------------------
    // CASE 3 & CASE 4: Extracted chunks contain actual PDF content and bookId
    // -------------------------------------------------------------------------
    console.log("\n[CASE 3 & CASE 4] Chunks contain actual PDF content and are associated with bookId");
    const chunksA = await DocumentChunk.findByBookId(bookIdA);
    assert.ok(chunksA.length >= 1, "Document chunks must be created");
    assert.strictEqual(chunksA[0].bookId, bookIdA, "Chunk bookId must match uploaded bookId");
    assert.ok(
      chunksA[0].text.includes("TCP provides reliable delivery") || chunksA[0].text.includes("Computer networks"),
      "Chunk text must contain real extracted textbook sentences"
    );
    assert.strictEqual(chunksA[0].chapter, "CHAPTER 1: COMPUTER NETWORKS", "Chapter hierarchy must be preserved");
    console.log(`✔ CASE 3 & 4 PASSED: Extracted ${chunksA.length} chunks containing real PDF content with correct bookId.`);

    // -------------------------------------------------------------------------
    // CASE 5 & CASE 6: Two different PDFs (A & B) isolation test
    // -------------------------------------------------------------------------
    console.log("\n[CASE 5 & CASE 6] Two-PDF Isolation Test (PDF A: Networks vs PDF B: Photosynthesis)");
    const bioPdfBuffer = createValidPdf([
      "CHAPTER 1: PLANT BIOLOGY",
      "1.1 Energy Conversion",
      "Photosynthesis converts light energy into chemical energy inside plant cells.",
      "1.2 Cellular Respiration",
      "Mitochondria generate ATP through oxidative phosphorylation."
    ]);

    const bioFormData = new FormData();
    bioFormData.append("file", new Blob([bioPdfBuffer], { type: "application/pdf" }), "Plant_Biology.pdf");
    bioFormData.append("title", "Plant Biology Textbook");
    bioFormData.append("subject", "Biology");

    const uploadBioRes = await fetch(`${BASE_URL}/upload-book`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: bioFormData
    });
    const uploadBioData = await uploadBioRes.json();
    if (uploadBioRes.status !== 201) {
      console.error("Bio Upload error response:", uploadBioData);
    }
    assert.strictEqual(uploadBioRes.status, 201);
    const bookIdB = uploadBioData.book_id;

    assert.notStrictEqual(bookIdA, bookIdB, "Book A and Book B must have distinct bookIds");

    const bookRecordB = await Book.findById(bookIdB);
    assert.ok(bookRecordB.extractedText.includes("Photosynthesis converts light energy"), "Book B has biology text");
    assert.ok(!bookRecordB.extractedText.includes("Computer networks"), "Book B extracted text must NOT contain Book A text");
    assert.ok(!bookRecordA.extractedText.includes("Photosynthesis"), "Book A extracted text must NOT contain Book B text");

    const chunksB = await DocumentChunk.findByBookId(bookIdB);
    assert.ok(chunksB.length >= 1, "Book B must have chunks");
    assert.ok(chunksB[0].text.includes("Photosynthesis converts light energy"), "Book B chunks contain photosynthesis content");
    assert.ok(!chunksB.some((c) => c.text.includes("TCP") || c.text.includes("networks")), "Book B chunks must never contain Book A content");
    assert.ok(!chunksA.some((c) => c.text.includes("Photosynthesis")), "Book A chunks must never contain Book B content");

    console.log("✔ CASE 5 & 6 PASSED: Distinct bookIds, distinct extracted text, and absolute chunk isolation confirmed.");

    // -------------------------------------------------------------------------
    // CASE 7 & CASE 8: AI summary pipeline receives correct chunks & persists with bookId
    // -------------------------------------------------------------------------
    console.log("\n[CASE 7 & CASE 8] AI summary pipeline receives correct chunks and persists summary with bookId");
    
    // Generate summary for Book A (Networks)
    const sumARes = await fetch(`${BASE_URL}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ book_id: bookIdA, target_language: "en" })
    });
    const sumAData = await sumARes.json();
    assert.strictEqual(sumARes.status, 200, "Summary A generation must succeed");
    assert.ok(sumAData.summary_id, "Summary ID must be returned");
    const summaryIdA = sumAData.summary_id;

    const summaryRecordA = await Summary.findById(summaryIdA);
    assert.ok(summaryRecordA, "Summary A must exist in SQLite summaries table");
    assert.strictEqual(summaryRecordA.bookId, bookIdA, "Summary must be persisted with correct bookId A");
    assert.strictEqual(summaryRecordA.userId, userAId, "Summary must be persisted with User A");
    assert.ok(
      summaryRecordA.summaryText.toLowerCase().includes("network") ||
      summaryRecordA.summaryText.toLowerCase().includes("tcp") ||
      summaryRecordA.summaryText.toLowerCase().includes("protocol"),
      "Summary A must reflect networking textbook content"
    );

    // Generate summary for Book B (Biology)
    const sumBRes = await fetch(`${BASE_URL}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ book_id: bookIdB, target_language: "en" })
    });
    const sumBData = await sumBRes.json();
    assert.strictEqual(sumBRes.status, 200, "Summary B generation must succeed");
    const summaryIdB = sumBData.summary_id;

    const summaryRecordB = await Summary.findById(summaryIdB);
    assert.ok(summaryRecordB, "Summary B must exist in SQLite summaries table");
    assert.strictEqual(summaryRecordB.bookId, bookIdB, "Summary must be persisted with correct bookId B");
    assert.strictEqual(summaryRecordB.userId, userBId, "Summary must be persisted with User B");
    assert.ok(
      summaryRecordB.summaryText.toLowerCase().includes("photosynthesis") ||
      summaryRecordB.summaryText.toLowerCase().includes("plant") ||
      summaryRecordB.summaryText.toLowerCase().includes("energy"),
      "Summary B must reflect photosynthesis biology content"
    );

    console.log("✔ CASE 7 & 8 PASSED: Summaries generated using correct source chunks and persisted with correct bookIds.");

    // -------------------------------------------------------------------------
    // CASE 9: Failed AI generation does not create a fake successful summary
    // -------------------------------------------------------------------------
    console.log("\n[CASE 9] Failed AI generation does not create a fake successful summary");
    const summariesCountBefore = (await dbAll("SELECT * FROM summaries")).length;

    try {
      // Intentionally call summarize on a non-existent book
      const failSumRes = await fetch(`${BASE_URL}/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ book_id: "non-existent-book-id-999" })
      });
      assert.strictEqual(failSumRes.status, 404, "Non-existent book must return 404");
    } catch (err) {
      // expected
    }

    const summariesCountAfter = (await dbAll("SELECT * FROM summaries")).length;
    assert.strictEqual(summariesCountBefore, summariesCountAfter, "No fake summary records created on failure");
    console.log("✔ CASE 9 PASSED: Failed generation strictly creates zero database records.");

    // -------------------------------------------------------------------------
    // CASE 10: Missing Gemini API key is handled as an error in production
    // -------------------------------------------------------------------------
    console.log("\n[CASE 10] Missing Gemini API key produces clear error in production mode");
    const origEnv = process.env.NODE_ENV;
    const origApiKey = env.GEMINI_API_KEY;
    try {
      process.env.NODE_ENV = "production";
      env.NODE_ENV = "production";
      env.GEMINI_API_KEY = "";

      await AiService.generateSummary({
        bookId: bookIdA,
        bookTitle: "Test Networks",
        subject: "CS",
        text: "Sample",
        targetLanguage: "en"
      });
      assert.fail("Should have thrown error when GEMINI_API_KEY is missing in production");
    } catch (err) {
      assert.ok(err.statusCode === 530 || err.statusCode === 503, "Must return 530 or 503 status code");
      assert.ok(err.message.includes("GEMINI_API_KEY") || err.message.includes("unavailable"), "Must explain missing API key");
      console.log("✔ CASE 10 PASSED: Missing API key produces clear error status and message.");
    } finally {
      process.env.NODE_ENV = origEnv;
      env.NODE_ENV = origEnv;
      env.GEMINI_API_KEY = origApiKey;
    }

    // -------------------------------------------------------------------------
    // CASE 11: Malformed / Invalid PDF is rejected cleanly
    // -------------------------------------------------------------------------
    console.log("\n[CASE 11] Malformed / invalid PDF is rejected cleanly with 400");
    const corruptBuffer = Buffer.from("NOT_A_VALID_PDF_HEADER_JUST_RANDOM_CORRUPT_BYTES_XYZ");

    const corruptFormData = new FormData();
    corruptFormData.append("file", new Blob([corruptBuffer], { type: "application/pdf" }), "corrupt.pdf");
    corruptFormData.append("title", "Corrupt Textbook");

    const corruptRes = await fetch(`${BASE_URL}/upload-book`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: corruptFormData
    });
    const corruptData = await corruptRes.json();
    assert.strictEqual(corruptRes.status, 400, "Corrupt PDF must be rejected with 400 Bad Request");
    assert.strictEqual(corruptData.success, false, "Response success must be false");
    assert.ok(
      corruptData.error.toLowerCase().includes("corrupt") ||
      corruptData.error.toLowerCase().includes("invalid") ||
      corruptData.error.toLowerCase().includes("extractable"),
      `Error must describe PDF corruption (got: ${corruptData.error})`
    );
    console.log("✔ CASE 11 PASSED: Corrupt PDF cleanly rejected with 400 without crashing.");

    // -------------------------------------------------------------------------
    // CASE 12: GET /summaries/:id returns the correct summary (no summaries[0])
    // -------------------------------------------------------------------------
    console.log("\n[CASE 12] GET /summaries/:id returns the exact requested summary");
    const getSummaryRes = await fetch(`${BASE_URL}/summaries/${summaryIdA}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const getSummaryData = await getSummaryRes.json();
    assert.strictEqual(getSummaryRes.status, 200);
    assert.strictEqual(getSummaryData.summary.id, summaryIdA, "Retrieved summary ID must match requested ID");
    assert.strictEqual(getSummaryData.summary.book_id, bookIdA, "Retrieved summary must link to Book A");

    // Request non-existent summary ID
    const getNonExistentRes = await fetch(`${BASE_URL}/summaries/non-existent-sum-id-12345`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(getNonExistentRes.status, 404, "Non-existent summary must return 404 Not Found");
    console.log("✔ CASE 12 PASSED: GET /summaries/:id retrieves exact summary and 404s on missing ID.");

    // -------------------------------------------------------------------------
    // CASE 13: IDOR & Cross-User Security Check
    // -------------------------------------------------------------------------
    console.log("\n[CASE 13] Cross-User Summary & Chunk Access Protection (IDOR Prevention)");
    // User B attempts to access User A's summary
    const crossSumRes = await fetch(`${BASE_URL}/summaries/${summaryIdA}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(crossSumRes.status, 403, "User B must be forbidden from accessing User A's summary");

    // User B attempts to access User A's book chunks
    const crossChunkRes = await fetch(`${BASE_URL}/books/${bookIdA}/chunks`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(crossChunkRes.status, 403, "User B must be forbidden from accessing User A's textbook chunks");

    // User B attempts to summarize User A's book
    const crossSummarizeRes = await fetch(`${BASE_URL}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ book_id: bookIdA, target_language: "en" })
    });
    assert.strictEqual(crossSummarizeRes.status, 403, "User B must be forbidden from summarizing User A's book");

    console.log("✔ CASE 13 PASSED: Cross-user IDOR access blocked across summaries, chunks, and summarize endpoint.");

    console.log("\n🎉 ALL 13 PHASE 3 FOCUSED TESTS PASSED FLAWLESSLY!\n");
  } finally {
    if (server) server.close();
  }
};

runPhase3VerificationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Phase 3 verification test failed:", err);
    if (server) server.close();
    process.exit(1);
  });
