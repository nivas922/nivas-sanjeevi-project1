import assert from "node:assert";
import { env } from "../src/config/env.js";
process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

import { app } from "../src/app.js";
import { Book } from "../src/models/Book.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { DoubtRetrievalService } from "../src/services/doubtRetrievalService.js";
import { AiSummaryService } from "../src/services/aiSummaryService.js";

async function runAiTutorTextbookLookupRegressionTests() {
  console.log("==================================================");
  console.log("🧪 AI TUTOR TEXTBOOK LOOKUP REGRESSION TEST SUITE");
  console.log("==================================================\n");

  const PORT = 5585;
  const server = app.listen(PORT);
  const BASE_URL = `http://127.0.0.1:${PORT}/api`;

  try {
    const timestamp = Date.now();
    const emailA = `lookup.alice.${timestamp}@university.edu`;
    const emailB = `lookup.bob.${timestamp}@university.edu`;

    // Create User A
    const signupARes = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, name: "Alice Student", password: "Password123!" })
    });
    const signupAData = await signupARes.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, otp: signupAData.devOtp })
    });
    const loginARes = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password: "Password123!" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.token;
    const userAId = loginAData.user.id;

    // Create User B
    const signupBRes = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, name: "Bob Student", password: "Password123!" })
    });
    const signupBData = await signupBRes.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, otp: signupBData.devOtp })
    });
    const loginBRes = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, password: "Password123!" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.token;
    const userBId = loginBData.user.id;

    // Create Book 1 for User A (Operating Systems)
    const book1Id = `book_os_${timestamp}`;
    const book1 = await Book.create({
      id: book1Id,
      user_id: userAId,
      file_url: "/uploads/operating_systems.pdf",
      title: "Operating Systems Concepts",
      subject: "Operating Systems",
      extracted_text: "A semaphore is a synchronization tool that provides a sophisticated way to coordinate threads."
    });

    const chunk1 = await DocumentChunk.create({
      id: `chk_os1_${timestamp}`,
      book_id: book1.id,
      chapter: "Chapter 5: Process Synchronization",
      section: "5.3 Semaphores and Mutexes",
      page_start: 220,
      page_end: 225,
      chunk_index: 0,
      text: "A counting semaphore has an integer value that can range over an unrestricted domain. A binary semaphore can range only between 0 and 1, functioning similarly to a mutex lock."
    });

    // Create Book 2 for User A (Database Systems)
    const book2Id = `book_db_${timestamp}`;
    const book2 = await Book.create({
      id: book2Id,
      user_id: userAId,
      file_url: "/uploads/database_systems.pdf",
      title: "Database System Concepts",
      subject: "Databases",
      extracted_text: "ACID properties: Atomicity, Consistency, Isolation, and Durability ensure reliable transaction processing."
    });

    const chunk2 = await DocumentChunk.create({
      id: `chk_db1_${timestamp}`,
      book_id: book2.id,
      chapter: "Chapter 14: Transactions",
      section: "14.1 ACID Properties",
      page_start: 610,
      page_end: 615,
      chunk_index: 0,
      text: "Atomicity ensures that all operations in a transaction complete successfully; if any step fails, the entire transaction is rolled back to preserve consistency."
    });

    // Create Book 3 for User B (Private Quantum Physics)
    const book3Id = `book_quant_${timestamp}`;
    const book3 = await Book.create({
      id: book3Id,
      user_id: userBId,
      file_url: "/uploads/quantum_physics.pdf",
      title: "Introduction to Quantum Mechanics",
      subject: "Physics",
      extracted_text: "Wave-particle duality and the Schrodinger wave equation."
    });

    const chunk3 = await DocumentChunk.create({
      id: `chk_quant1_${timestamp}`,
      book_id: book3.id,
      chapter: "Chapter 1: Wave Function",
      section: "1.2 Time-Dependent Schrodinger Equation",
      page_start: 1,
      page_end: 15,
      chunk_index: 0,
      text: "The wave function represents the quantum state of a particle and yields the probability distribution of its position."
    });

    // Stub Gemini API for deterministic, fast test execution
    AiSummaryService.callGeminiApiWithRetry = async (prompt) => {
      if (prompt.includes("semaphore")) {
        return JSON.stringify({
          answer: "A semaphore is a synchronization tool used to control access to common resources by multiple threads.",
          keyPoints: ["Binary and counting semaphores", "Prevents race conditions"],
          example: "sem_wait(&mutex); // enter critical section",
          confidence: "high",
          insufficientEvidence: false,
          followUpSuggestions: ["What is a mutex?", "Explain deadlock conditions"],
          source: [{ chunkId: chunk1.id, chapter: "Chapter 5: Process Synchronization", section: "5.3 Semaphores and Mutexes", pageStart: 220, pageEnd: 225 }]
        });
      }
      if (prompt.includes("ACID") || prompt.includes("atomicity")) {
        return JSON.stringify({
          answer: "Atomicity guarantees that all actions in a transaction succeed or none do (all-or-nothing principle).",
          keyPoints: ["Rollback on failure", "Preserves integrity"],
          example: "START TRANSACTION; UPDATE accounts ... ; COMMIT;",
          confidence: "high",
          insufficientEvidence: false,
          followUpSuggestions: ["What is Durability?", "Difference between Isolation levels"],
          source: [{ chunkId: chunk2.id, chapter: "Chapter 14: Transactions", section: "14.1 ACID Properties", pageStart: 610, pageEnd: 615 }]
        });
      }
      return JSON.stringify({
        answer: "The uploaded textbook does not contain enough information to answer this question confidently.",
        confidence: "none",
        insufficientEvidence: true,
        keyPoints: ["Information not found in textbook"],
        example: null,
        followUpSuggestions: [],
        source: []
      });
    };

    // ========================================================
    // REGRESSION TEST 1: Valid uploaded textbook ID reaches retrieval
    // ========================================================
    console.log("[TEST 1] A valid uploaded textbook ID successfully reaches retrieval");
    const res1 = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: book1.id,
        question: "Explain what a counting semaphore is",
        language: "en"
      })
    });
    assert.strictEqual(res1.status, 200, "Valid book ID should return 200 OK");
    const data1 = await res1.json();
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.hasRelevantContent, true);
    assert.strictEqual(data1.source[0].chunkId, chunk1.id);
    assert.strictEqual(data1.source[0].chapter, "Chapter 5: Process Synchronization");
    console.log("✔ TEST 1 PASSED: Valid uploaded book ID successfully retrieved passage.\n");

    // ========================================================
    // REGRESSION TEST 2: Selecting a different textbook sends its ID
    // ========================================================
    console.log("[TEST 2] Selecting a different textbook sends its ID and retrieves from that book");
    const res2 = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: book2.id,
        question: "Explain atomicity in ACID transaction properties",
        language: "en"
      })
    });
    assert.strictEqual(res2.status, 200, "Second book ID should return 200 OK");
    const data2 = await res2.json();
    assert.strictEqual(data2.success, true);
    assert.strictEqual(data2.hasRelevantContent, true);
    assert.strictEqual(data2.source[0].chunkId, chunk2.id);
    assert.strictEqual(data2.source[0].chapter, "Chapter 14: Transactions");
    console.log("✔ TEST 2 PASSED: Switching to different textbook ID successfully retrieved its own chapters.\n");

    // ========================================================
    // REGRESSION TEST 3: Missing book ID returns a clear validation error (400)
    // ========================================================
    console.log("[TEST 3] Missing book ID returns clear 400 validation error");
    const res3 = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        question: "What is a semaphore?",
        language: "en"
      })
    });
    assert.strictEqual(res3.status, 400, "Missing bookId should return HTTP 400");
    const data3 = await res3.json();
    assert.strictEqual(data3.success, false);
    assert.strictEqual(data3.error, "bookId is required.");

    // Also test empty string and whitespace-only bookId
    const res3b = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: "   ",
        question: "What is a semaphore?",
        language: "en"
      })
    });
    assert.strictEqual(res3b.status, 400, "Whitespace bookId should return HTTP 400");
    console.log("✔ TEST 3 PASSED: Missing or blank book ID rejected with 400 validation error.\n");

    // ========================================================
    // REGRESSION TEST 4: Unknown book ID returns 404 Textbook not found
    // ========================================================
    console.log("[TEST 4] Unknown book ID returns expected 404 not-found response");
    const res4 = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: "unknown-uuid-00000000",
        question: "Explain semaphores",
        language: "en"
      })
    });
    assert.strictEqual(res4.status, 404, "Unknown book ID should return HTTP 404");
    const data4 = await res4.json();
    assert.strictEqual(data4.success, false);
    assert.strictEqual(data4.error, "Textbook not found.");
    console.log("✔ TEST 4 PASSED: Unknown textbook ID returns clear 404 'Textbook not found.'\n");

    // ========================================================
    // REGRESSION TEST 5: Book belonging to another user cannot be accessed (403)
    // ========================================================
    console.log("[TEST 5] A book belonging to another user cannot be accessed");
    // User A attempts to access User B's book (book3)
    const res5 = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: book3.id,
        question: "Explain wave function",
        language: "en"
      })
    });
    assert.strictEqual(res5.status, 403, "Accessing another user's book should return HTTP 403");
    const data5 = await res5.json();
    assert.strictEqual(data5.success, false);
    assert.strictEqual(data5.error, "Access denied. You do not have permission to access this textbook.");

    // Unauthenticated user attempts to access User B's private book (book3)
    const res5Unauth = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: book3.id,
        question: "Explain wave function",
        language: "en"
      })
    });
    assert.strictEqual(res5Unauth.status, 403, "Unauthenticated access to private book should return HTTP 403");

    // Check GET /books/:id and GET /books/:id/chunks authorization
    const res5GetBook = await fetch(`${BASE_URL}/books/${book3.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res5GetBook.status, 403, "GET /books/:id for another user's book must return 403");

    const res5GetChunks = await fetch(`${BASE_URL}/books/${book3.id}/chunks`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res5GetChunks.status, 403, "GET /books/:id/chunks for another user's book must return 403");

    // Verify GET /books library list isolates user books
    const res5ListA = await fetch(`${BASE_URL}/books`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const data5ListA = await res5ListA.json();
    const idsA = data5ListA.books.map((b) => b.id);
    assert.ok(idsA.includes(book1.id), "User A library must include book1");
    assert.ok(idsA.includes(book2.id), "User A library must include book2");
    assert.ok(!idsA.includes(book3.id), "User A library must NOT include User B's book3");

    // User B (the actual owner) can access their own book
    const res5b = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bookId: book3.id,
        question: "Explain wave function in Schrodinger equation",
        language: "en"
      })
    });
    assert.strictEqual(res5b.status, 200, "Book owner should successfully access their own book");
    console.log("✔ TEST 5 PASSED: Unauthorized cross-user textbook access blocked with 403 across doubt and book APIs; owner authorized.\n");

    // ========================================================
    // REGRESSION TEST 6: Follow-up questions keep the current book ID
    // ========================================================
    console.log("[TEST 6] Follow-up questions keep the current book ID");
    const res6 = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: book1.id,
        question: "How does binary semaphore differ from mutex lock?",
        language: "en",
        conversationHistory: [
          { role: "user", text: "Explain what a counting semaphore is" },
          { role: "assistant", text: "A semaphore is a synchronization tool..." }
        ]
      })
    });
    assert.strictEqual(res6.status, 200);
    const data6 = await res6.json();
    assert.strictEqual(data6.success, true);
    assert.strictEqual(data6.source[0].chunkId, chunk1.id, "Follow-up question should retain retrieval from same book");
    console.log("✔ TEST 6 PASSED: Follow-up question maintained textbook context from the current book ID.\n");

    // ========================================================
    // REGRESSION TEST 7: Floating AI Tutor and Clear Your Doubts behave consistently
    // ========================================================
    console.log("[TEST 7] Floating AI Tutor and full Clear Your Doubts page behave consistently");
    // Both components call api.askDoubt with { bookId, question, language, conversationHistory }
    // Test that whether bookId or book_id naming is supplied, both return identical valid contracts
    const res7Page = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: book2.id,
        question: "Explain atomicity in transactions",
        language: "en"
      })
    });
    const data7Page = await res7Page.json();

    const res7Float = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        book_id: book2.id,
        question: "Explain atomicity in transactions",
        language: "en"
      })
    });
    const data7Float = await res7Float.json();

    assert.strictEqual(data7Page.success, true);
    assert.strictEqual(data7Float.success, true);
    assert.strictEqual(data7Page.answer, data7Float.answer);
    assert.strictEqual(data7Page.source[0].chunkId, data7Float.source[0].chunkId);
    console.log("✔ TEST 7 PASSED: Both bookId and book_id parameters return identical grounded answers.\n");

    // ========================================================
    // REGRESSION TEST 8: No cross-book retrieval occurs
    // ========================================================
    console.log("[TEST 8] No cross-book retrieval occurs");
    // Querying book1 (Operating Systems) with an ACID question must NOT retrieve chunk2 from book2 (Databases)
    const res8 = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: book1.id,
        question: "Explain atomicity in transactions",
        language: "en"
      })
    });
    assert.strictEqual(res8.status, 200);
    const data8 = await res8.json();
    assert.strictEqual(data8.hasRelevantContent, false, "OS book should not contain Database ACID passages");
    assert.strictEqual(data8.insufficientEvidence, true);
    assert.strictEqual(data8.source.length, 0, "No cross-book sources should be cited");

    // Raw retrieval test
    const rawRetrieval = await DoubtRetrievalService.retrieveRelevantChunks(book1.id, "atomicity ACID transactions", 5);
    for (const c of rawRetrieval.chunks) {
      assert.strictEqual(c.book_id, book1.id, "Chunk must belong strictly to requested book1");
      assert.notStrictEqual(c.book_id, book2.id, "Chunk must NOT leak from book2");
    }
    console.log("✔ TEST 8 PASSED: Complete cross-book retrieval isolation verified.\n");

    console.log("==================================================");
    console.log("🎉 ALL 8 AI TUTOR LOOKUP REGRESSION TESTS PASSED!");
    console.log("==================================================\n");
  } finally {
    server.close();
  }
}

runAiTutorTextbookLookupRegressionTests().catch((err) => {
  console.error("❌ Regression test failed:", err);
  process.exit(1);
});
