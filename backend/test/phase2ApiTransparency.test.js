import assert from "assert";
import http from "http";
import { storageService } from "../../frontend/src/services/storageService.js";
import { api, handleApiResponse, handleNetworkError } from "../../frontend/src/services/api.js";

// Mock localStorage in Node test environment
if (typeof globalThis.localStorage === "undefined") {
  let store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; }
  };
}

const TEST_PORT = 5578;
let testServer;
let mockResponseHandler = null;

const createTestServer = () => {
  return new Promise((resolve) => {
    testServer = http.createServer((req, res) => {
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (mockResponseHandler) {
        mockResponseHandler(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "No mock handler registered" }));
      }
    });

    testServer.listen(TEST_PORT, () => {
      resolve();
    });
  });
};

const runPhase2Tests = async () => {
  console.log("\n🧪 Running Phase 2 API Communication & Error Transparency Test Suite...\n");

  await createTestServer();
  console.log(` Test mock server listening on port ${TEST_PORT}\n`);

  // Override fetch globally to point to our test mock server for endpoints starting with /api
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const urlStr = String(url);
    const resolvedUrl = urlStr.startsWith("/api")
      ? `http://localhost:${TEST_PORT}${urlStr}`
      : urlStr;
    return originalFetch(resolvedUrl, options);
  };

  try {
    const fakePdfFile = {
      name: "advanced_computer_architecture.pdf",
      size: 1024 * 50
    };
    const metadata = {
      targetLanguage: "ta",
      targetLanguageName: "Tamil",
      difficulty: "Advanced",
      summaryLength: "Detailed",
      questionCount: 5
    };

    // -----------------------------------------------------------------
    // CASE 1: Successful API request returns actual backend data
    // -----------------------------------------------------------------
    console.log("[Case 1] Successful API request returns actual backend data");
    storageService.clearSession();
    storageService.setToken("valid.jwt.token");

    const realBackendBook = {
      id: "book-real-comp-arch-999",
      title: "Advanced Computer Architecture",
      subject: "Computer Science",
      created_at: new Date().toISOString()
    };
    const realBackendSummary = {
      id: "sum-real-comp-arch-888",
      book_id: "book-real-comp-arch-999",
      bookTitle: "Advanced Computer Architecture",
      topic: "Advanced Computer Architecture",
      language: "ta",
      summary_text: "உண்மையான ஜெமினி ஏஐ சுருக்கம் (Real Gemini AI Summary)",
      summaryText: "உண்மையான ஜெமினி ஏஐ சுருக்கம் (Real Gemini AI Summary)",
      keyConcepts: ["Pipelining", "Branch Prediction", "Cache Coherence"],
      simpleExplanation: "எளிய விளக்கம்: கணினி செயலாக்க வேகத்தை அதிகரிக்கும் கட்டமைப்பு.",
      created_at: new Date().toISOString()
    };
    const realBackendQuiz = {
      id: "quiz-real-777",
      book_id: "book-real-comp-arch-999",
      num_questions: 5,
      questions: []
    };

    mockResponseHandler = (req, res) => {
      if (req.url === "/api/upload-book" && req.method === "POST") {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, book: realBackendBook, book_id: realBackendBook.id }));
      } else if (req.url === "/api/summarize" && req.method === "POST") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, summary: realBackendSummary }));
      } else if (req.url === "/api/generate-quiz" && req.method === "POST") {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, quiz: realBackendQuiz }));
      }
    };

    const successResult = await api.uploadTextbook(fakePdfFile, metadata);
    assert.strictEqual(successResult.status, "success");
    assert.strictEqual(successResult.textbook.id, realBackendBook.id);
    assert.strictEqual(successResult.summary.id, realBackendSummary.id);
    assert.strictEqual(successResult.summary.summaryText, realBackendSummary.summaryText);

    // Verify stored summary in localStorage matches real backend summary
    const storedSummary = storageService.getSummaryById(realBackendSummary.id);
    assert.ok(storedSummary, "Real summary must be saved in storageService");
    assert.strictEqual(storedSummary.id, realBackendSummary.id);
    assert.strictEqual(storedSummary.summaryText, realBackendSummary.summaryText);
    console.log("✔ Case 1 Passed: Genuine backend textbook and summary returned and stored.\n");

    // -----------------------------------------------------------------
    // CASE 2: Upload API returns 400 (Bad Request)
    // -----------------------------------------------------------------
    console.log("[Case 2] Upload API returns 400 (Bad Request) error propagation");
    storageService.clearSession();
    storageService.setToken("valid.jwt.token");

    mockResponseHandler = (req, res) => {
      if (req.url === "/api/upload-book") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Only valid PDF and image documents are accepted." }));
      }
    };

    let case2Threw = false;
    try {
      await api.uploadTextbook(fakePdfFile, metadata);
    } catch (err) {
      case2Threw = true;
      assert.strictEqual(err.status, 400);
      assert.ok(err.message.includes("Only valid PDF and image documents are accepted."));
    }
    assert.ok(case2Threw, "Upload API 400 error must be thrown");
    assert.strictEqual(storageService.getSummaries().length, 0, "No summary must be created on 400 failure");
    assert.strictEqual(storageService.getTextbooks().length, 0, "No textbook must be created on 400 failure");
    console.log("✔ Case 2 Passed: 400 error propagated; zero fake summaries/books stored.\n");

    // -----------------------------------------------------------------
    // CASE 3: Upload API returns 401 (Unauthorized / Session Expired)
    // -----------------------------------------------------------------
    console.log("[Case 3] Upload API returns 401 (Unauthorized) clears auth session");
    storageService.clearSession();
    storageService.setToken("expired.header.signature");
    assert.strictEqual(storageService.getToken(), "expired.header.signature");

    mockResponseHandler = (req, res) => {
      if (req.url === "/api/upload-book") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Invalid or expired authentication token. Please sign in again." }));
      }
    };

    let case3Threw = false;
    try {
      await api.uploadTextbook(fakePdfFile, metadata);
    } catch (err) {
      case3Threw = true;
      assert.strictEqual(err.status, 401);
      assert.ok(err.message.includes("Please sign in again"));
    }
    assert.ok(case3Threw, "Upload API 401 error must be thrown");
    assert.strictEqual(storageService.getToken(), null, "401 must clear invalid token from storageService");
    assert.strictEqual(storageService.getSummaries().length, 0, "No summary must be created on 401 failure");
    console.log("✔ Case 3 Passed: 401 cleared authentication state; no fake summary created.\n");

    // -----------------------------------------------------------------
    // CASE 4: Upload API returns 500 / 503 / 530 (Server / AI Service Error)
    // -----------------------------------------------------------------
    console.log("[Case 4] Upload API returns 500/503/530 error handling");
    storageService.clearSession();
    storageService.setToken("valid.jwt.token");

    // 4a: Server 500 on /upload-book
    mockResponseHandler = (req, res) => {
      if (req.url === "/api/upload-book") {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Internal processing crash while extracting PDF." }));
      }
    };

    let case4aThrew = false;
    try {
      await api.uploadTextbook(fakePdfFile, metadata);
    } catch (err) {
      case4aThrew = true;
      assert.strictEqual(err.status, 500);
      assert.ok(err.message.includes("Internal processing crash while extracting PDF."));
    }
    assert.ok(case4aThrew, "500 error must be thrown");
    assert.strictEqual(storageService.getSummaries().length, 0, "No fake summary on 500");

    // 4b: Service 503 on /summarize
    mockResponseHandler = (req, res) => {
      if (req.url === "/api/upload-book") {
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, book: realBackendBook, book_id: realBackendBook.id }));
      } else if (req.url === "/api/summarize") {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Gemini AI model service unavailable due to upstream rate limit." }));
      }
    };

    let case4bThrew = false;
    try {
      await api.uploadTextbook(fakePdfFile, metadata);
    } catch (err) {
      case4bThrew = true;
      assert.strictEqual(err.status, 503);
      assert.ok(err.message.includes("Gemini AI model service unavailable"));
    }
    assert.ok(case4bThrew, "503 error on summarization must be thrown");
    assert.strictEqual(storageService.getSummaries().length, 0, "No static MULTILINGUAL_SUMMARIES fallback returned");
    console.log("✔ Case 4 Passed: 500/503 errors propagated; static summary template strictly prohibited.\n");

    // -----------------------------------------------------------------
    // CASE 5: Backend is unreachable (Network failure / Render asleep)
    // -----------------------------------------------------------------
    console.log("[Case 5] Backend unreachable / network failure handling");
    storageService.clearSession();
    storageService.setToken("valid.jwt.token");

    // Temporarily replace fetch with one that simulates network disconnection
    const disconnectedFetch = () => Promise.reject(new TypeError("Failed to fetch"));
    globalThis.fetch = disconnectedFetch;

    let case5Threw = false;
    try {
      await api.uploadTextbook(fakePdfFile, metadata);
    } catch (err) {
      case5Threw = true;
      assert.strictEqual(err.isNetworkError, true);
      assert.strictEqual(err.message, "Unable to connect to the backend server. Please check your connection and try again.");
    }
    assert.ok(case5Threw, "Network failure must throw understandable connection error");
    assert.strictEqual(storageService.getSummaries().length, 0, "No fake summary on network failure");
    console.log("✔ Case 5 Passed: Network error caught; user informed cleanly; no fake data stored.\n");

    // Restore test server fetch
    globalThis.fetch = async (url, options = {}) => {
      const urlStr = String(url);
      const resolvedUrl = urlStr.startsWith("/api")
        ? `http://localhost:${TEST_PORT}${urlStr}`
        : urlStr;
      return originalFetch(resolvedUrl, options);
    };

    // -----------------------------------------------------------------
    // CASE 6: Requested summary ID does not exist
    // -----------------------------------------------------------------
    console.log("[Case 6] Requested summary ID does not exist returns null (no summaries[0] substitute)");
    storageService.clearSession();
    // Add one unrelated summary to storage
    storageService.addSummary({ id: "sum-unrelated-existing-1", topic: "Operating Systems", summaryText: "OS Summary" });
    assert.strictEqual(storageService.getSummaries().length, 1);

    mockResponseHandler = (req, res) => {
      if (req.url === "/api/summaries/non-existent-id") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Summary not found." }));
      }
    };

    const notFoundSummary = await api.getSummaryById("non-existent-id");
    assert.strictEqual(notFoundSummary, null, "Must return null, NEVER an unrelated summary or summaries[0]");
    const storageNotFound = storageService.getSummaryById("non-existent-id");
    assert.strictEqual(storageNotFound, null, "storageService.getSummaryById must return null when ID is absent");
    console.log("✔ Case 6 Passed: Non-existent summary ID returns null cleanly without substituting summaries[0].\n");

    // -----------------------------------------------------------------
    // CASE 7: Valid backend summary is returned
    // -----------------------------------------------------------------
    console.log("[Case 7] Valid backend summary is retrieved by ID");
    mockResponseHandler = (req, res) => {
      if (req.url === `/api/summaries/${realBackendSummary.id}`) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, summary: realBackendSummary }));
      }
    };

    const retrievedSummary = await api.getSummaryById(realBackendSummary.id);
    assert.ok(retrievedSummary, "Retrieved summary must exist");
    assert.strictEqual(retrievedSummary.id, realBackendSummary.id);
    assert.strictEqual(retrievedSummary.summaryText, realBackendSummary.summaryText);
    console.log("✔ Case 7 Passed: Exact backend summary retrieved and returned.\n");

    // -----------------------------------------------------------------
    // CASE 8: Failed request must not write a fabricated summary into localStorage
    // -----------------------------------------------------------------
    console.log("[Case 8] Failed request must not write fabricated summary into localStorage");
    storageService.clearSession();
    assert.strictEqual(localStorage.getItem("learnai_summaries_v3"), null);

    mockResponseHandler = (req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Server exploded" }));
    };

    try {
      await api.uploadTextbook(fakePdfFile, metadata);
    } catch {}

    const rawSummaries = localStorage.getItem("learnai_summaries_v3");
    assert.strictEqual(rawSummaries, null, "localStorage learnai_summaries_v3 must remain empty/null after failure");
    console.log("✔ Case 8 Passed: No fabricated summaries written to localStorage.\n");

    console.log("🎉 ALL 8 PHASE 2 API COMMUNICATION & TRANSPARENCY TESTS PASSED SUCCESSFULLY!\n");
  } finally {
    globalThis.fetch = originalFetch;
    if (testServer) {
      testServer.close();
    }
  }
};

runPhase2Tests().catch((err) => {
  console.error("❌ Phase 2 Test Suite Failed:", err);
  if (testServer) testServer.close();
  process.exit(1);
});
