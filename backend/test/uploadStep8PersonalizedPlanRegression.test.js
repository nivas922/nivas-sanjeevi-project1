import http from "http";
import assert from "assert";
import { api, fetchWithTimeout } from "../../frontend/src/services/api.js";
import { storageService } from "../../frontend/src/services/storageService.js";
import { AdaptiveLearningService } from "../src/services/adaptiveLearningService.js";
import { Book } from "../src/models/Book.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";

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

const TEST_PORT = 5592;
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
  console.log("\n🧪 Running Regression Test Suite for Step 8 Personalized Learning Plan Fix...\n");

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
    name: "Computer_Networks_Chapter_1.pdf",
    size: 1024 * 50,
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
    id: "book-reg-101",
    title: "Computer Networks Chapter 1",
    subject: "Computer Networks",
    user_id: "usr_default"
  };

  const mockSummary = {
    id: "sum-reg-101",
    book_id: mockBook.id,
    summaryText: "Comprehensive summary of computer networks",
    summary_text: "Comprehensive summary of computer networks"
  };

  const mockQuiz = {
    id: "quiz-reg-101",
    book_id: mockBook.id,
    num_questions: 5,
    questions: [{ id: "q1", question: "What is IP?", options: ["A", "B", "C", "D"], correctAnswer: 0 }]
  };

  const mockAdaptivePlan = {
    success: true,
    user_id: "usr_default",
    book_id: mockBook.id,
    overallProgress: 0,
    learningPath: [
      { step: 1, chapter: "Chapter 1: Network Core", status: "in_progress", action: "Take Starter Quiz", recommendedDifficulty: "Intermediate" }
    ],
    recommendations: [],
    insufficientHistory: true
  };

  try {
    // -----------------------------------------------------------------
    // TEST 1: Full progressive upload pipeline executes all 8 steps & prepares learning plan
    // -----------------------------------------------------------------
    console.log("[TEST 1] Verify sequential progress stages 1 through 8 and learning plan preparation");
    storageService.clearSession();
    storageService.setToken("valid.jwt.token");

    const stagesReported = [];
    let uploadCallCount = 0;
    let summarizeCallCount = 0;
    let quizCallCount = 0;
    let planCallCount = 0;

    mockResponseHandler = (req, res) => {
      if (req.url === "/api/upload-book" && req.method === "POST") {
        uploadCallCount++;
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, book: mockBook, book_id: mockBook.id }));
      } else if (req.url === "/api/summarize" && req.method === "POST") {
        summarizeCallCount++;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, summary: mockSummary }));
      } else if (req.url === "/api/generate-quiz" && req.method === "POST") {
        quizCallCount++;
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, quiz: mockQuiz }));
      } else if (req.url === `/api/adaptive-learning/${mockBook.id}` && req.method === "GET") {
        planCallCount++;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mockAdaptivePlan));
      }
    };

    const result = await api.uploadTextbook(
      fakePdfFile,
      metadata,
      (stage) => {
        stagesReported.push(stage);
      },
      { timeoutMs: 5000, planTimeoutMs: 5000 }
    );

    assert.strictEqual(result.status, "success", "Pipeline must return success status");
    assert.strictEqual(result.textbook.id, mockBook.id, "Correct book must be returned");
    assert.strictEqual(result.summary.id, mockSummary.id, "Correct summary must be returned");
    assert.strictEqual(result.quiz.id, mockQuiz.id, "Correct quiz must be returned");
    assert.ok(result.learningPlan, "Personalized learning plan must be returned");
    assert.strictEqual(uploadCallCount, 1, "Upload-book must be called once");
    assert.strictEqual(summarizeCallCount, 1, "Summarize must be called once");
    assert.strictEqual(quizCallCount, 1, "Generate-quiz must be called once");
    assert.strictEqual(planCallCount, 1, "Adaptive-learning plan must be called once");

    // Verify stage progression
    const stepNumbers = stagesReported.map((s) => s.step);
    assert.ok(stepNumbers.includes(1), "Step 1 must be reported");
    assert.ok(stepNumbers.includes(2), "Step 2 must be reported");
    assert.ok(stepNumbers.includes(3), "Step 3 must be reported");
    assert.ok(stepNumbers.includes(4), "Step 4 must be reported");
    assert.ok(stepNumbers.includes(5), "Step 5 must be reported");
    assert.ok(stepNumbers.includes(6), "Step 6 must be reported");
    assert.ok(stepNumbers.includes(7), "Step 7 must be reported");
    assert.ok(stepNumbers.includes(8), "Step 8 must be reported");
    assert.ok(stepNumbers.includes(9), "Completion step 9 must be reported");

    const finalStage = stagesReported[stagesReported.length - 1];
    assert.strictEqual(finalStage.percent, 100, "Final progress must reach 100%");
    console.log("✔ TEST 1 PASSED: Sequential stages 1-8 and learning plan completed cleanly.\n");

    // -----------------------------------------------------------------
    // TEST 2: Timeout Case Handling - AbortSignal triggers clean error without spinning forever
    // -----------------------------------------------------------------
    console.log("[TEST 2] Verify fetch timeout triggers clean error without hanging");
    mockResponseHandler = (req, res) => {
      // Deliberately hold request open to test timeout
    };

    let timeoutThrew = false;
    try {
      await fetchWithTimeout(`http://localhost:${TEST_PORT}/api/summarize`, {}, 300);
    } catch (err) {
      timeoutThrew = true;
      assert.ok(
        err.name === "AbortError" || err.message.includes("timed out"),
        `Error must be an abort or timeout error: ${err.message}`
      );
    }
    assert.ok(timeoutThrew, "fetchWithTimeout must throw on timeout");
    console.log("✔ TEST 2 PASSED: Timeout triggered safely after specified duration.\n");

    // -----------------------------------------------------------------
    // TEST 3: Retry with Existing Artifacts Prevents Duplicate Creation
    // -----------------------------------------------------------------
    console.log("[TEST 3] Verify retry with existing book & summary prevents duplicate generation");
    uploadCallCount = 0;
    summarizeCallCount = 0;
    quizCallCount = 0;
    planCallCount = 0;

    mockResponseHandler = (req, res) => {
      if (req.url === "/api/upload-book") uploadCallCount++;
      if (req.url === "/api/summarize") summarizeCallCount++;
      if (req.url === "/api/generate-quiz") {
        quizCallCount++;
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, quiz: mockQuiz }));
      }
      if (req.url.startsWith("/api/adaptive-learning/")) {
        planCallCount++;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(mockAdaptivePlan));
      }
    };

    const retryResult = await api.uploadTextbook(
      fakePdfFile,
      metadata,
      () => {},
      {
        existingBook: mockBook,
        existingSummary: mockSummary,
        timeoutMs: 5000,
        planTimeoutMs: 5000
      }
    );

    assert.strictEqual(uploadCallCount, 0, "Must NOT call /upload-book when existingBook is provided");
    assert.strictEqual(summarizeCallCount, 0, "Must NOT call /summarize when existingSummary is provided");
    assert.strictEqual(quizCallCount, 1, "Must generate quiz on retry");
    assert.strictEqual(planCallCount, 1, "Must generate learning plan on retry");
    assert.strictEqual(retryResult.textbook.id, mockBook.id);
    assert.strictEqual(retryResult.summary.id, mockSummary.id);
    console.log("✔ TEST 3 PASSED: Duplicate creation strictly prevented on retry.\n");

    // -----------------------------------------------------------------
    // TEST 4: Backend AdaptiveLearningService safely handles zero quiz history
    // -----------------------------------------------------------------
    console.log("[TEST 4] Verify AdaptiveLearningService zero-history safe learning plan generation");
    const testBook = await Book.create({
      user_id: "usr_reg_test_zero",
      file_url: "/uploads/os.pdf",
      title: "Operating Systems Fundamentals",
      subject: "Operating Systems",
      extracted_text: "Chapter 1: Processes and Threads. Chapter 2: Memory Management."
    });

    await DocumentChunk.create({
      book_id: testBook.id,
      chapter: "Chapter 1: Processes and Threads",
      section: "1.1 Process Lifecycle",
      text: "A process is a program in execution.",
      chunk_index: 0,
      page_start: 1,
      page_end: 15
    });

    await DocumentChunk.create({
      book_id: testBook.id,
      chapter: "Chapter 2: Memory Management",
      section: "2.1 Paging and Segmentation",
      text: "Virtual memory separates logical and physical memory.",
      chunk_index: 1,
      page_start: 16,
      page_end: 35
    });

    const generatedPath = await AdaptiveLearningService.generateLearningPath("usr_reg_test_zero", testBook.id);
    assert.ok(Array.isArray(generatedPath), "Learning path must be an array");
    assert.strictEqual(generatedPath.length, 2, "Path must have 2 chapters");
    assert.strictEqual(generatedPath[0].status, "in_progress", "First chapter starts in_progress");
    assert.strictEqual(generatedPath[1].status, "upcoming", "Subsequent chapter starts upcoming");

    const zeroDashboard = await AdaptiveLearningService.getAdaptiveDashboard("usr_reg_test_zero", testBook.id);
    assert.strictEqual(zeroDashboard.insufficientHistory, true, "Must flag insufficientHistory without throwing");
    assert.strictEqual(zeroDashboard.recommendations.length, 0, "Zero fake recommendations");
    assert.strictEqual(zeroDashboard.learningPath.length, 2, "Real curriculum learning path included");

    await Book.deleteById(testBook.id);
    console.log("✔ TEST 4 PASSED: Backend learning path generated safely for fresh textbook with zero history.\n");

    console.log("🎉 ALL STEP 8 REGRESSION TESTS PASSED SUCCESSFULLY!\n");
  } finally {
    await stopMockServer();
  }
}

runRegressionTests().catch((err) => {
  console.error("❌ Regression Test Failed:", err);
  process.exit(1);
});
