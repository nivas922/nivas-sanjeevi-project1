import http from "http";
import assert from "assert";
import { api, fetchWithTimeout } from "../../frontend/src/services/api.js";
import { storageService } from "../../frontend/src/services/storageService.js";
import { AiSummaryService } from "../src/services/aiSummaryService.js";
import { Book } from "../src/models/Book.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { Summary } from "../src/models/Summary.js";
import { SummaryController } from "../src/controllers/summaryController.js";
import { initDb } from "../src/config/db.js";
import { env } from "../src/config/env.js";

env.NODE_ENV = "test";
process.env.NODE_ENV = "test";

// Mock localStorage for Node.js test environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

const TEST_PORT = 5594;
let mockServer;
let mockResponseHandler = null;

function startMockServer() {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (mockResponseHandler) {
        mockResponseHandler(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Not Found" }));
      }
    });

    mockServer.listen(TEST_PORT, () => {
      resolve();
    });
  });
}

function stopMockServer() {
  return new Promise((resolve) => {
    if (mockServer) {
      mockServer.close(resolve);
    } else {
      resolve();
    }
  });
}

async function runRegressionTests() {
  console.log("\n🧪 Running Regression Test Suite for Step 5 Summarization Timeout & Duplicate Prevention Fix...\n");

  await startMockServer();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    const resolvedUrl = urlStr.startsWith("/api")
      ? `http://localhost:${TEST_PORT}${urlStr}`
      : urlStr;
    return originalFetch(resolvedUrl, options);
  };

  const fakePdfFile = {
    name: "Distributed_Systems_Chapter_1.pdf",
    size: 1024 * 60,
    type: "application/pdf"
  };

  const metadata = {
    targetLanguage: "en",
    targetLanguageName: "English",
    difficulty: "Intermediate",
    summaryLength: "Detailed",
    questionCount: 5
  };

  const mockBook = {
    id: "book-reg-step5-001",
    book_id: "book-reg-step5-001",
    title: "Distributed Systems Chapter 1",
    subject: "Distributed Systems",
    user_id: "usr_default"
  };

  const mockSummary = {
    id: "sum-reg-step5-001",
    book_id: mockBook.id,
    summaryText: "Comprehensive summary of distributed systems",
    summary_text: "Comprehensive summary of distributed systems",
    key_concepts: ["Consensus", "Replication"],
    quick_revision: { revisionPoints: ["Paxos", "Raft"] }
  };

  try {
    // -----------------------------------------------------------------------------------
    // TEST 1: Step 5 Timeout Reproduction & Clean Error Presentation
    // -----------------------------------------------------------------------------------
    console.log("[TEST 1] Reproduce Step 5 timeout when summarization exceeds configured timeout");

    let uploadBookCalls = 0;
    let summarizeCalls = 0;

    mockResponseHandler = (req, res) => {
      if (req.url === "/api/upload-book" && req.method === "POST") {
        uploadBookCalls++;
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, book: mockBook, book_id: mockBook.id }));
        return;
      }
      if (req.url === "/api/summarize" && req.method === "POST") {
        summarizeCalls++;
        // Simulate a long backend summarization call that exceeds 80ms
        setTimeout(() => {
          if (!res.writableEnded) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, summary: mockSummary }));
          }
        }, 300);
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    };

    let caughtError = null;
    let savedArtifactsOnTimeout = {};
    const recordedStages = [];

    try {
      await api.uploadTextbook(
        fakePdfFile,
        metadata,
        (stage) => recordedStages.push(stage),
        {
          timeoutMs: 500,
          summarizeTimeoutMs: 80, // Forced small timeout for testing
          onArtifactCreated: (type, data) => {
            savedArtifactsOnTimeout[type] = data;
          }
        }
      );
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, "Step 5 timeout must throw a clear error");
    assert.strictEqual(caughtError.status, 504, "Error status must be 504 Gateway Timeout");
    assert.ok(
      caughtError.message.includes("AI summarization took longer than expected"),
      `Error message must guide user to retry: got '${caughtError.message}'`
    );
    assert.strictEqual(uploadBookCalls, 1, "upload-book should have been called once");
    assert.strictEqual(summarizeCalls, 1, "summarize should have been called once");
    assert.ok(
      savedArtifactsOnTimeout.existingBook,
      "Intermediate existingBook artifact must be captured even when summarization times out"
    );
    assert.strictEqual(savedArtifactsOnTimeout.existingBook.id, mockBook.id);
    console.log("✔ TEST 1 PASSED: Step 5 timeout triggered clear 504 error and saved intermediate existingBook artifact.\n");

    // -----------------------------------------------------------------------------------
    // TEST 2: Retry with Saved Artifact Prevents Duplicate Upload on Step 5
    // -----------------------------------------------------------------------------------
    console.log("[TEST 2] Verify retry with saved existingBook skips upload-book and resumes at Step 5");

    let retryUploadCalls = 0;
    let retrySummarizeCalls = 0;
    let retryQuizCalls = 0;
    let retryPlanCalls = 0;

    mockResponseHandler = (req, res) => {
      if (req.url === "/api/upload-book" && req.method === "POST") {
        retryUploadCalls++;
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, book: mockBook, book_id: mockBook.id }));
        return;
      }
      if (req.url === "/api/summarize" && req.method === "POST") {
        retrySummarizeCalls++;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, summary: mockSummary }));
        return;
      }
      if (req.url === "/api/generate-quiz" && req.method === "POST") {
        retryQuizCalls++;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, quiz: { id: "quiz-step5-001", questions: [] } }));
        return;
      }
      if (req.url.startsWith("/api/adaptive-learning/") && req.method === "GET") {
        retryPlanCalls++;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, roadmap: [] }));
        return;
      }
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    };

    const retryResult = await api.uploadTextbook(
      fakePdfFile,
      metadata,
      () => {},
      {
        existingBook: savedArtifactsOnTimeout.existingBook,
        summarizeTimeoutMs: 2000
      }
    );

    assert.strictEqual(retryUploadCalls, 0, "upload-book must NOT be re-called on retry!");
    assert.strictEqual(retrySummarizeCalls, 1, "summarize must be called once on retry");
    assert.strictEqual(retryQuizCalls, 1, "generate-quiz must complete");
    assert.strictEqual(retryPlanCalls, 1, "adaptive-learning plan must complete");
    assert.strictEqual(retryResult.textbook.id, mockBook.id);
    assert.strictEqual(retryResult.summary.id, mockSummary.id);
    console.log("✔ TEST 2 PASSED: Retry strictly bypassed upload-book and successfully completed Step 5 & Step 8.\n");

    // -----------------------------------------------------------------------------------
    // TEST 3: Single-Chunk Summarization Optimization (1 Gemini Call vs 3 Calls)
    // -----------------------------------------------------------------------------------
    console.log("[TEST 3] Verify single-chunk document avoids redundant Chapter and Final Gemini calls");

    const singleSec = {
      section: "Section 1.1",
      overview: "Section 1.1 overview",
      summary: "Section 1.1 summary",
      keyPoints: ["Concept A"],
      definitions: [{ term: "A", meaning: "Alpha" }],
      formulas: [],
      examples: [],
      examPoints: ["Exam A"],
      pageStart: 1,
      pageEnd: 1
    };

    const singleChap = await AiSummaryService.summarizeChapter("Chapter 1", [singleSec], "en");
    assert.strictEqual(singleChap.chapter, "Chapter 1");
    assert.strictEqual(singleChap.overview, "Section 1.1 overview");
    assert.deepStrictEqual(singleChap.keyPoints, ["Concept A"]);

    const finalSummary = await AiSummaryService.generateFinalBookSummary("Book A", "Subject A", [singleChap], "en");
    assert.strictEqual(finalSummary.overallSummary, "Section 1.1 overview");
    assert.deepStrictEqual(finalSummary.keyPoints, ["Concept A"]);
    assert.deepStrictEqual(finalSummary.definitions, [{ term: "A", meaning: "Alpha" }]);
    assert.strictEqual(finalSummary.chapters.length, 1);
    console.log("✔ TEST 3 PASSED: Single-chunk document correctly collapsed without redundant Gemini round-trips.\n");

    // -----------------------------------------------------------------------------------
    // TEST 4: Gemini Call Timeout Failover Across Candidate Models
    // -----------------------------------------------------------------------------------
    console.log("[TEST 4] Verify callGeminiApiWithRetry advances to next candidate model on timeout");

    const originalFetchGlobal = global.fetch;
    const originalApiKey = env.GEMINI_API_KEY;
    env.GEMINI_API_KEY = "test-verification-api-key";
    AiSummaryService.resetModelCache();

    let attemptedModels = [];
    global.fetch = async (url, opts) => {
      const match = url.match(/\/models\/([^:]+):generateContent/);
      const modelName = match ? match[1] : "unknown";
      attemptedModels.push(modelName);

      if (modelName === "gemini-3.5-flash-lite") {
        // Simulate timeout on first model
        const timeoutErr = new Error("The operation was aborted due to timeout");
        timeoutErr.name = "TimeoutError";
        throw timeoutErr;
      }
      if (modelName === "gemini-3.8-flash") {
        return {
          status: 200,
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "Successful failover response" }] } }]
          })
        };
      }
      return originalFetchGlobal(url, opts);
    };

    try {
      const failoverText = await AiSummaryService.callGeminiApiWithRetry("Test prompt failover", {
        timeoutMs: 100,
        maxRetries: 2,
        initialDelayMs: 10
      });
      assert.strictEqual(failoverText, "Successful failover response");
      assert.ok(attemptedModels.includes("gemini-3.5-flash-lite"), "Must attempt first candidate model");
      assert.ok(attemptedModels.includes("gemini-3.8-flash"), "Must fail over to second candidate model on timeout");
      assert.strictEqual(AiSummaryService.getActiveWorkingModel(), "gemini-3.8-flash");
      console.log("✔ TEST 4 PASSED: callGeminiApiWithRetry cleanly failed over to next model on timeout.\n");
    } finally {
      global.fetch = originalFetchGlobal;
      env.GEMINI_API_KEY = originalApiKey;
      AiSummaryService.resetModelCache();
    }

    // -----------------------------------------------------------------------------------
    // TEST 5: Backend Summary Reuse on Retry Prevents Redundant Gemini Calls
    // -----------------------------------------------------------------------------------
    console.log("[TEST 5] Verify SummaryController reuses existing completed summary from database");
    await initDb();

    const testReuseBookId = "book-reuse-step5-" + Date.now();
    await Book.create({
      id: testReuseBookId,
      user_id: "usr_default",
      file_url: "/uploads/test-reuse.pdf",
      title: "Test Reuse Book",
      subject: "Testing",
      extracted_text: "Text for reuse testing"
    });

    const preExistingSummary = await Summary.create({
      book_id: testReuseBookId,
      user_id: "usr_default",
      language: "en",
      summary_text: "Existing verified summary text",
      key_concepts: ["Concept X"],
      definitions: [{ term: "Term X", meaning: "Meaning X" }]
    });

    let mockReq = {
      body: { book_id: testReuseBookId, target_language: "en" }
    };
    let mockResJson = null;
    let mockResStatus = null;
    let mockRes = {
      status: (code) => {
        mockResStatus = code;
        return {
          json: (data) => { mockResJson = data; }
        };
      }
    };

    await SummaryController.summarize(mockReq, mockRes, () => {});
    assert.strictEqual(mockResStatus, 200, "Must return HTTP 200 on summary reuse");
    assert.strictEqual(mockResJson.summary_id, preExistingSummary.id, "Must return existing summary ID");
    assert.ok(mockResJson.message.includes("existing record"), "Must indicate reuse from existing record");

    const allSummariesForBook = await Summary.findByBookId(testReuseBookId);
    assert.strictEqual(allSummariesForBook.length, 1, "Must NOT create a duplicate summary record in SQLite");
    console.log("✔ TEST 5 PASSED: Backend cleanly reused existing summary without duplicating.\n");

    // -----------------------------------------------------------------------------------
    // TEST 6: Background Job Status Polling Endpoint
    // -----------------------------------------------------------------------------------
    console.log("[TEST 6] Verify getSummarizeStatus returns completed summary for polling");

    let statusReq = {
      params: { bookId: testReuseBookId },
      query: { target_language: "en" }
    };
    let statusResJson = null;
    let statusResCode = null;
    let statusResObj = {
      status: (code) => {
        statusResCode = code;
        return {
          json: (data) => { statusResJson = data; }
        };
      }
    };

    await SummaryController.getSummarizeStatus(statusReq, statusResObj, () => {});
    assert.strictEqual(statusResCode, 200);
    assert.strictEqual(statusResJson.status, "completed");
    assert.strictEqual(statusResJson.progress, 100);
    assert.strictEqual(statusResJson.summary.id, preExistingSummary.id);
    console.log("✔ TEST 6 PASSED: Status polling correctly returned completed summary.\n");

    // -----------------------------------------------------------------------------------
    // TEST 7: Multi-Chunk Bounded Summarization (15 chunks)
    // -----------------------------------------------------------------------------------
    console.log("[TEST 7] Verify 15-chunk document completes via bounded section summarization");

    const testMultiChunkBookId = "book-multi-step5-" + Date.now();
    await Book.create({
      id: testMultiChunkBookId,
      user_id: "usr_default",
      file_url: "/uploads/test-multichunk.pdf",
      title: "Multi Chunk Architecture",
      subject: "Computer Systems",
      extracted_text: "Content for multi chunk architecture"
    });

    const mockChunks = [];
    for (let c = 1; c <= 3; c++) {
      for (let s = 1; s <= 5; s++) {
        mockChunks.push({
          id: `chk_multi_${Date.now()}_${c}_${s}`,
          book_id: testMultiChunkBookId,
          chapter: `Chapter ${c}: Scalable Systems`,
          section: `${c}.${s} Component Isolation`,
          page_start: (c - 1) * 5 + s,
          page_end: (c - 1) * 5 + s,
          chunk_index: (c - 1) * 5 + s - 1,
          text: `Detailed architectural explanation of module ${c}.${s} focusing on fault isolation, scalability, and loose coupling.`
        });
      }
    }
    assert.strictEqual(mockChunks.length, 15, "15 chunks created");
    await DocumentChunk.createMany(mockChunks);

    let progressCalls = [];
    const multiResult = await AiSummaryService.summarizeBookFromChunks({
      bookId: testMultiChunkBookId,
      bookTitle: "Multi Chunk Architecture",
      subject: "Computer Systems",
      targetLanguage: "en",
      onProgress: (pct, stage) => progressCalls.push({ pct, stage })
    });

    assert.ok(multiResult.overallSummary, "Must produce overall summary");
    assert.ok(multiResult.keyPoints.length > 0, "Must extract key points");
    assert.ok(multiResult.chapters.length >= 1, "Must contain chapter breakdowns");
    assert.ok(progressCalls.length > 0, "Progress callbacks must be invoked");
    console.log("✔ TEST 7 PASSED: 15-chunk document successfully synthesized with bounded sections.\n");

    console.log("🎉 ALL STEP 5 REGRESSION TESTS PASSED SUCCESSFULLY!\n");
  } finally {
    globalThis.fetch = originalFetch;
    await stopMockServer();
  }
}

runRegressionTests().catch((err) => {
  console.error("❌ REGRESSION TEST FAILED:", err);
  process.exit(1);
});
