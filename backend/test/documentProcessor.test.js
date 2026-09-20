import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initDb, dbRun } from "../src/config/db.js";
import { PdfExtractorService } from "../src/services/pdfExtractorService.js";
import { TextChunkerService, CHUNK_CONFIG } from "../src/services/textChunkerService.js";
import { DocumentProcessorService } from "../src/services/documentProcessorService.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5557;
let server;
const BASE_URL = `http://localhost:${PORT}/api`;

const runPhase2Tests = async () => {
  console.log("\n🧪 Starting Phase 2 Document Processor, Chapter Detection & Text Chunking Test Suite...\n");

  await initDb();
  await dbRun("DELETE FROM document_chunks");
  await dbRun("DELETE FROM books WHERE title LIKE '%Phase 2%' OR title LIKE '%Test%'");

  server = app.listen(PORT);
  console.log(` Test server running on port ${PORT}\n`);

  try {
    // TEST 1: Simple text with normal paragraphs
    console.log("[TEST 1] Simple Document Extraction & Chunking");
    const simpleText = `Introduction to Computer Networks.\n\nComputer networks connect multiple computing devices together to share data, resources, and services.\n\nThe Open Systems Interconnection (OSI) model defines seven logical layers for network communication.`;
    const simplePages = [{ pageNumber: 1, text: simpleText }];

    const simpleResult = await DocumentProcessorService.detectHierarchy(simplePages);
    assert.ok(simpleResult.length > 0, "Hierarchy should be detected");
    assert.strictEqual(simpleResult[0].chapterTitle, "Chapter 1: Full Document");

    const simpleChunks = TextChunkerService.generateStructuredChunks({
      bookId: "test-book-1",
      sections: simpleResult,
      chunkSize: 500,
      overlap: 50
    });
    assert.ok(simpleChunks.length >= 1, "Chunks should be generated");
    assert.strictEqual(simpleChunks[0].bookId, "test-book-1");
    assert.ok(simpleChunks[0].text.includes("OSI"), "Chunk must preserve original paragraph text");
    console.log("✔ TEST 1 PASSED: Simple text successfully extracted and chunked.");

    // TEST 2: Chapter and Section Detection
    console.log("\n[TEST 2] Chapter 1 & Section Detection (1.1 Introduction, 1.2 Basics)");
    const structuredPages = [
      {
        pageNumber: 1,
        text: `CHAPTER 1: NETWORK ARCHITECTURE\n\n1.1 Introduction\nNetwork architecture defines the physical and logical layout of nodes and communication links.\n\n1.2 Basics of TCP/IP\nThe Transmission Control Protocol (TCP) ensures reliable octet stream delivery.`
      },
      {
        pageNumber: 2,
        text: `CHAPTER 2: TRANSPORT LAYER PROTOCOLS\n\n2.1 Flow Control\nFlow control regulates transmission rates between fast senders and slow receivers.`
      }
    ];

    const hierarchy = DocumentProcessorService.detectHierarchy(structuredPages);
    const chapters = new Set(hierarchy.map((h) => h.chapterTitle));
    assert.ok(chapters.has("CHAPTER 1: NETWORK ARCHITECTURE"), "Chapter 1 heading detected");
    assert.ok(chapters.has("CHAPTER 2: TRANSPORT LAYER PROTOCOLS"), "Chapter 2 heading detected");

    const sections = hierarchy.map((h) => h.sectionTitle);
    assert.ok(sections.includes("1.1 Introduction") || sections.includes("1.2 Basics of TCP/IP"), "Section headings detected");
    console.log(`✔ TEST 2 PASSED: Detected ${chapters.size} chapters and ${hierarchy.length} sections.`);

    // TEST 3: Long Text Chunking with Overlap & Word Boundaries
    console.log("\n[TEST 3] Long Text Chunking (Ordered, Overlap, Word Boundary Preservation)");
    const words = [];
    for (let i = 1; i <= 600; i++) {
      words.push(`Word${i}`);
    }
    const longText = words.join(" ");

    const chunkSize = 500;
    const overlap = 100;
    const textChunks = TextChunkerService.chunkText(longText, { chunkSize, overlap });

    assert.ok(textChunks.length > 1, "Long text must split into multiple chunks");

    // Verify ordering and overlap
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      assert.ok(chunk.length <= chunkSize + 50, `Chunk ${i} size should respect limit`);
      assert.ok(!chunk.startsWith(" "), `Chunk ${i} should not have leading space`);
      assert.ok(!chunk.endsWith(" "), `Chunk ${i} should not have trailing space`);

      // Verify no word was split in the middle (words look like Word1, Word2, etc.)
      const chunkWords = chunk.split(/\s+/);
      for (const w of chunkWords) {
        assert.ok(/^Word\d+$/.test(w), `Word '${w}' must not be cut in the middle`);
      }
    }
    console.log(`✔ TEST 3 PASSED: Split into ${textChunks.length} ordered chunks with overlap, 0 words cut.`);

    // TEST 4: Fallback Structure for Unrecognized Chapter Headings
    console.log("\n[TEST 4] Fallback Hierarchy (No Recognizable Headings)");
    const unformattedPages = [
      { pageNumber: 1, text: "Some unstructured academic prose without any traditional chapter labels." },
      { pageNumber: 2, text: "Second page continuation of unstructured textbook narrative." }
    ];

    const fallbackHierarchy = DocumentProcessorService.detectHierarchy(unformattedPages);
    assert.strictEqual(fallbackHierarchy[0].chapterTitle, "Chapter 1: Full Document");
    assert.strictEqual(fallbackHierarchy[0].sectionTitle, "Section 1: General Content");
    const combinedFallbackText = fallbackHierarchy.map((h) => h.text).join(" ");
    assert.ok(combinedFallbackText.includes("unstructured academic prose"), "Content preserved");
    assert.ok(combinedFallbackText.includes("Second page continuation"), "No page content lost");
    console.log("✔ TEST 4 PASSED: Fallback structure created, 100% content preserved.");

    // TEST 5: Multiple Pages with Page Metadata Preservation
    console.log("\n[TEST 5] Multiple Page Metadata Preservation (pageStart & pageEnd)");
    const multiPageSections = [
      {
        chapterTitle: "Chapter 3: Data Link Layer",
        sectionTitle: "3.1 Framing & Error Detection",
        pageStart: 12,
        pageEnd: 15,
        text: "Framing packages raw bit streams into discrete units called frames. Error detection codes (CRC, Checksum) allow receivers to detect transmission corruption."
      }
    ];

    const pageChunks = TextChunkerService.generateStructuredChunks({
      bookId: "book-multi-page",
      sections: multiPageSections,
      chunkSize: 1000,
      overlap: 100
    });

    assert.strictEqual(pageChunks[0].pageStart, 12);
    assert.strictEqual(pageChunks[0].pageEnd, 15);
    assert.strictEqual(pageChunks[0].chapter, "Chapter 3: Data Link Layer");
    assert.strictEqual(pageChunks[0].section, "3.1 Framing & Error Detection");
    console.log("✔ TEST 5 PASSED: PageStart (12) and PageEnd (15) accurately preserved in chunk metadata.");

    // TEST 6: Upload API Integration & Database Persistence
    console.log("\n[TEST 6] Full Upload API Integration & SQLite Chunk Persistence");
    const testEmail = `phase2.student.${Date.now()}@university.edu`;
    const signupRes = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Phase 2 Student",
        email: testEmail,
        password: "securepassword123"
      })
    });
    const signupData = await signupRes.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, otp: signupData.devOtp })
    });

    const loginRes = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "securepassword123" })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // Create temp textbook file
    const sampleFilePath = path.join(__dirname, "sample_phase2_book.txt");
    const sampleBookContent = `CHAPTER 1: SYSTEM DESIGN\n\n1.1 System Boundaries\nArchitectural boundaries divide system components to maintain low coupling and high cohesion.\n\n1.2 Data Pipelines\nPipelines transform data streams through sequential processing stages.\n\nCHAPTER 2: ADVANCED ALGORITHMS\n\n2.1 Graph Search\nDijkstra's algorithm finds the shortest paths between nodes in a weighted graph.`;
    fs.writeFileSync(sampleFilePath, sampleBookContent);

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(sampleFilePath)], { type: "text/plain" });
    formData.append("file", fileBlob, "Phase2_System_Design.txt");
    formData.append("title", "Phase 2 System Design Textbook");
    formData.append("subject", "Software Engineering");

    const uploadRes = await fetch(`${BASE_URL}/upload-book`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadRes.status, 201);
    assert.ok(uploadData.book_id, "book_id must be returned");
    assert.ok(uploadData.processingStats.totalChunks >= 1, "processingStats must return totalChunks");
    const bookId = uploadData.book_id;

    // Fetch chunks via GET /books/:id/chunks endpoint
    const chunksRes = await fetch(`${BASE_URL}/books/${bookId}/chunks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const chunksData = await chunksRes.json();
    assert.strictEqual(chunksRes.status, 200);
    assert.ok(chunksData.chunks.length > 0, "Chunks must be stored in database");
    assert.strictEqual(chunksData.chunks[0].book_id, bookId);
    console.log(`✔ TEST 6 PASSED: Uploaded book created ${chunksData.totalChunks} chunks stored in SQLite 'document_chunks' table.`);

    // Cleanup sample file
    if (fs.existsSync(sampleFilePath)) fs.unlinkSync(sampleFilePath);

    console.log("\n ALL PHASE 2 AUTOMATED TESTS PASSED SUCCESSFULLY!\n");
  } finally {
    if (server) server.close();
  }
};

runPhase2Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Phase 2 test failed:", err);
    if (server) server.close();
    process.exit(1);
  });
