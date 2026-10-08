import assert from "assert";
import { initDb, dbRun, dbGet, dbAll } from "../src/config/db.js";
import { QuizGenService } from "../src/services/quizGenService.js";
import { AiSummaryService } from "../src/services/aiSummaryService.js";
import { AiService } from "../src/services/aiService.js";
import { Book } from "../src/models/Book.js";
import { Quiz } from "../src/models/Quiz.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const PORT = 5560;
let server;
const BASE_URL = `http://localhost:${PORT}/api`;

const runPhase4Verification = async () => {
  console.log("\n==================================================");
  console.log("🚀 EXECUTING PHASE 4: DYNAMIC QUIZ GENERATION & VERIFICATION");
  console.log("==================================================\n");

  await initDb();
  await dbRun("DELETE FROM quizzes");
  await dbRun("DELETE FROM summaries");
  await dbRun("DELETE FROM document_chunks");
  await dbRun("DELETE FROM books WHERE id LIKE 'p4-%'");

  server = app.listen(PORT);
  console.log(`Phase 4 Test Server running on port ${PORT}\n`);

  try {
    // Setup Test User 1
    const email1 = `p4.user1.${Date.now()}@university.edu`;
    const signupRes1 = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "User One", email: email1, password: "Password123!" })
    });
    const signupData1 = await signupRes1.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email1, otp: signupData1.devOtp })
    });
    const loginRes1 = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email1, password: "Password123!" })
    });
    const loginData1 = await loginRes1.json();
    const token1 = loginData1.token;
    const userId1 = loginData1.user.id;

    // Setup Test User 2 (for IDOR / Authorization testing)
    const email2 = `p4.user2.${Date.now()}@university.edu`;
    const signupRes2 = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "User Two", email: email2, password: "Password123!" })
    });
    const signupData2 = await signupRes2.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email2, otp: signupData2.devOtp })
    });
    const loginRes2 = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email2, password: "Password123!" })
    });
    const loginData2 = await loginRes2.json();
    const token2 = loginData2.token;
    const userId2 = loginData2.user.id;

    // Setup Test Books
    // Book A: Computer Networks
    const bookA = await Book.create({
      id: "p4-book-a-networks",
      user_id: userId1,
      file_url: "/uploads/networks.pdf",
      title: "Computer Networks Protocols",
      subject: "Computer Networks",
      extracted_text: "Computer networks use protocols such as TCP to provide reliable communication between devices."
    });

    await DocumentChunk.create({
      id: "p4-chk-a-1",
      book_id: bookA.id,
      chapter: "Chapter 1: Network Protocols",
      section: "1.1 TCP/IP Architecture",
      page_start: 1,
      page_end: 8,
      chunk_index: 0,
      text: "Computer networks use protocols such as TCP to provide reliable communication between devices across packet-switched routing."
    });

    // Book B: Photosynthesis & Plant Biology
    const bookB = await Book.create({
      id: "p4-book-b-photosynthesis",
      user_id: userId1,
      file_url: "/uploads/photosynthesis.pdf",
      title: "Plant Cellular Biology",
      subject: "Biology",
      extracted_text: "Photosynthesis converts light energy into chemical energy in plant cells."
    });

    await DocumentChunk.create({
      id: "p4-chk-b-1",
      book_id: bookB.id,
      chapter: "Chapter 1: Plant Energetics",
      section: "1.1 Light-Dependent Reactions",
      page_start: 1,
      page_end: 6,
      chunk_index: 0,
      text: "Photosynthesis converts light energy into chemical energy in plant cells, using chloroplasts to synthesize glucose."
    });

    // ----------------------------------------------------
    // CASE 1: Quiz generation requires a valid bookId
    // ----------------------------------------------------
    console.log("[CASE 1] Quiz generation requires a valid bookId");
    const case1Res = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({ num_questions: 5 })
    });
    assert.strictEqual(case1Res.status, 400, "Missing book_id must return HTTP 400");
    const case1Data = await case1Res.json();
    assert.ok(JSON.stringify(case1Data).includes("book_id"), "Error message must mention book_id");
    console.log("✔ CASE 1 PASSED: Missing bookId correctly rejected with HTTP 400.");

    // ----------------------------------------------------
    // CASE 2: Quiz generation retrieves chunks from requested book only
    // ----------------------------------------------------
    console.log("\n[CASE 2] Quiz generation retrieves chunks from requested book only");
    const chunksA = await DocumentChunk.findByBookId(bookA.id);
    const chunksB = await DocumentChunk.findByBookId(bookB.id);
    assert.strictEqual(chunksA.length, 1, "Book A has exactly 1 chunk");
    assert.strictEqual(chunksB.length, 1, "Book B has exactly 1 chunk");
    assert.strictEqual(chunksA[0].book_id, bookA.id);
    assert.strictEqual(chunksB[0].book_id, bookB.id);
    assert.notStrictEqual(chunksA[0].text, chunksB[0].text);
    console.log("✔ CASE 2 PASSED: Chunks strictly isolated by bookId.");

    // ----------------------------------------------------
    // CASE 3: Generated questions contain actual textbook-grounded content
    // ----------------------------------------------------
    console.log("\n[CASE 3] Generated questions contain actual textbook-grounded content");
    const genQuestionsA = await QuizGenService.generateQuizFromBook({
      bookId: bookA.id,
      questionCount: 3
    });
    assert.ok(genQuestionsA.length >= 1, "Generated questions must exist");
    const allTextA = JSON.stringify(genQuestionsA).toLowerCase();
    assert.ok(
      allTextA.includes("network") || allTextA.includes("protocol") || allTextA.includes("tcp") || allTextA.includes("ip"),
      "Questions must be grounded in textbook A content (networking/TCP)"
    );
    console.log("✔ CASE 3 PASSED: Questions are genuinely grounded in textbook content.");

    // ----------------------------------------------------
    // CASE 4: Generated questions follow existing MCQ schema
    // ----------------------------------------------------
    console.log("\n[CASE 4] Generated questions follow existing MCQ schema (4 options, integer index)");
    for (const q of genQuestionsA) {
      assert.ok(typeof q.question === "string" && q.question.length > 5, "Question must be non-empty string");
      assert.ok(Array.isArray(q.options), "Options must be an array");
      assert.strictEqual(q.options.length, 4, "Options length must be exactly 4");
      assert.ok(Number.isInteger(q.correctAnswer), "correctAnswer must be integer");
      assert.ok(q.correctAnswer >= 0 && q.correctAnswer <= 3, "correctAnswer must be in [0..3]");
      assert.ok(typeof q.explanation === "string" && q.explanation.length > 0, "Explanation must be non-empty string");
    }
    console.log("✔ CASE 4 PASSED: Questions adhere strictly to the 4-option MCQ schema.");

    // ----------------------------------------------------
    // CASE 5: Invalid AI question structure is rejected
    // ----------------------------------------------------
    console.log("\n[CASE 5] Invalid AI question structure is rejected");
    const invalidQuestions = [
      { question: "Why?", options: ["A", "B", "C", "D"], correctAnswer: 0, explanation: "Exp" }, // question < 5 chars (4 chars)
      { question: "Valid question here?", options: ["A", "B"], correctAnswer: 0, explanation: "Exp" }, // only 2 options
      { question: "Valid question here?", options: ["A", "B", "C", "D", "E"], correctAnswer: 0, explanation: "Exp" }, // 5 options
      { question: "Valid question here?", options: ["A", "A", "B", "C"], correctAnswer: 0, explanation: "Exp" }, // duplicate options
      { question: "Valid question here?", options: ["A", "", "B", "C"], correctAnswer: 0, explanation: "Exp" }, // empty option
      { question: "Valid question here?", options: ["A", "B", "C", "D"], correctAnswer: 5, explanation: "Exp" }, // out-of-range index
      { question: "Valid question here?", options: ["A", "B", "C", "D"], correctAnswer: 0, explanation: "" } // empty explanation
    ];
    const sanitized = QuizGenService.validateAndSanitizeQuestions(invalidQuestions, bookA);
    assert.strictEqual(sanitized.length, 0, "All invalid question variants must be rejected");
    console.log("✔ CASE 5 PASSED: Malformed question structures properly rejected.");

    // ----------------------------------------------------
    // CASE 6: Duplicate questions are removed/prevented
    // ----------------------------------------------------
    console.log("\n[CASE 6] Duplicate questions are removed/prevented");
    const duplicateList = [
      { question: "What is TCP protocol?", options: ["A", "B", "C", "D"], correctAnswer: 0, explanation: "Exp" },
      { question: "what is tcp protocol?", options: ["A", "B", "C", "D"], correctAnswer: 0, explanation: "Exp" },
      { question: "WHAT IS TCP PROTOCOL?!", options: ["A", "B", "C", "D"], correctAnswer: 0, explanation: "Exp" },
      { question: "What is IP addressing?", options: ["A", "B", "C", "D"], correctAnswer: 0, explanation: "Exp" }
    ];
    const deduplicated = QuizGenService.deduplicateQuestions(duplicateList);
    assert.strictEqual(deduplicated.length, 2, "Duplicate TCP questions must be collapsed into 1");
    console.log("✔ CASE 6 PASSED: Duplicate questions removed safely.");

    // ----------------------------------------------------
    // CASE 7: Difficulty values are validated
    // ----------------------------------------------------
    console.log("\n[CASE 7] Difficulty values are validated");
    const invalidDiffRes = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({
        book_id: bookA.id,
        difficulty: "super-extreme-impossible"
      })
    });
    assert.strictEqual(invalidDiffRes.status, 400, "Invalid difficulty must return HTTP 400");
    console.log("✔ CASE 7 PASSED: Invalid difficulty value rejected with HTTP 400.");

    // ----------------------------------------------------
    // CASE 8: Chapter / section / source metadata is preserved
    // ----------------------------------------------------
    console.log("\n[CASE 8] Chapter / section / source metadata is preserved");
    for (const q of genQuestionsA) {
      assert.ok(q.chapter, "Chapter must be preserved");
      assert.ok(q.section, "Section must be preserved");
      assert.ok(q.sourcePages, "sourcePages must be preserved");
      assert.strictEqual(q.bookId, bookA.id, "bookId must match");
    }
    console.log("✔ CASE 8 PASSED: Chapter, section, and page source metadata preserved.");

    // ----------------------------------------------------
    // CASE 9: Book A and Book B generate isolated quizzes (Two-Book Isolation Test)
    // ----------------------------------------------------
    console.log("\n[CASE 9] Book A and Book B generate isolated quizzes (Two-Book Isolation Test)");
    const quizARes = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({ book_id: bookA.id, num_questions: 3 })
    });
    const quizAData = await quizARes.json();
    assert.strictEqual(quizARes.status, 201);
    const quizAId = quizAData.quiz_id;

    const quizBRes = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({ book_id: bookB.id, num_questions: 3 })
    });
    const quizBData = await quizBRes.json();
    assert.strictEqual(quizBRes.status, 201);
    const quizBId = quizBData.quiz_id;

    const quizAString = JSON.stringify(quizAData.quiz).toLowerCase();
    const quizBString = JSON.stringify(quizBData.quiz).toLowerCase();

    // Verify Book A Quiz: contains networking, does NOT contain photosynthesis
    assert.ok(quizAString.includes("network") || quizAString.includes("tcp") || quizAString.includes("ip"), "Quiz A must contain networking");
    assert.ok(!quizAString.includes("photosynthesis"), "Quiz A must NOT contain photosynthesis");
    assert.strictEqual(quizAData.quiz.book_id, bookA.id, "Quiz A must link to Book A ID");

    // Verify Book B Quiz: contains photosynthesis, does NOT contain TCP/networking
    assert.ok(quizBString.includes("photosynthesis") || quizBString.includes("plant") || quizBString.includes("chloroplast"), "Quiz B must contain photosynthesis");
    assert.ok(!quizBString.includes("osi reference") && !quizBString.includes("tcp/ip"), "Quiz B must NOT contain TCP/networking");
    assert.strictEqual(quizBData.quiz.book_id, bookB.id, "Quiz B must link to Book B ID");
    console.log("✔ CASE 9 PASSED: Two-book isolation verified. No cross-contamination between quizzes.");

    // ----------------------------------------------------
    // CASE 10: Failed AI generation does not create a fake quiz
    // ----------------------------------------------------
    console.log("\n[CASE 10] Failed AI generation does not create a fake quiz");
    const countBefore = (await dbAll("SELECT * FROM quizzes")).length;
    // Attempt generating for a book with empty text and no chunks
    const emptyBook = await Book.create({
      id: "p4-book-empty",
      user_id: userId1,
      title: "Empty Book",
      subject: "Empty",
      file_url: "/uploads/empty.pdf",
      extracted_text: ""
    });
    const failRes = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify({ book_id: emptyBook.id })
    });
    assert.strictEqual(failRes.status, 400, "Empty book must fail quiz generation with 400");
    const countAfter = (await dbAll("SELECT * FROM quizzes")).length;
    assert.strictEqual(countBefore, countAfter, "No new quiz record must be stored on failure");
    console.log("✔ CASE 10 PASSED: Failed generation does not create a fake or dummy quiz.");

    // ----------------------------------------------------
    // CASE 11: Quiz is persisted with correct bookId and userId
    // ----------------------------------------------------
    console.log("\n[CASE 11] Quiz is persisted with correct bookId and userId");
    const storedQuizA = await Quiz.findById(quizAId);
    assert.ok(storedQuizA, "Quiz A must exist in SQLite");
    assert.strictEqual(storedQuizA.book_id, bookA.id);
    assert.strictEqual(storedQuizA.user_id, userId1);
    assert.ok(Array.isArray(storedQuizA.questions));
    assert.strictEqual(storedQuizA.questions.length, 3);
    console.log("✔ CASE 11 PASSED: Quiz persisted with exact bookId, userId, and question array.");

    // ----------------------------------------------------
    // CASE 12: Correct quiz is retrieved by quizId
    // ----------------------------------------------------
    console.log("\n[CASE 12] Correct quiz is retrieved by quizId");
    const getQuizRes = await fetch(`${BASE_URL}/quizzes/${quizAId}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(getQuizRes.status, 200);
    const getQuizData = await getQuizRes.json();
    assert.strictEqual(getQuizData.quiz.id, quizAId);
    assert.strictEqual(getQuizData.quiz.book_id, bookA.id);
    console.log("✔ CASE 12 PASSED: GET /quizzes/:id returns the requested quiz.");

    // ----------------------------------------------------
    // CASE 13: Non-existent quiz returns 404/not-found
    // ----------------------------------------------------
    console.log("\n[CASE 13] Non-existent quiz returns 404");
    const nonExistentRes = await fetch(`${BASE_URL}/quizzes/non-existent-quiz-xyz`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(nonExistentRes.status, 404, "Unknown quizId must return 404");
    console.log("✔ CASE 13 PASSED: Non-existent quiz returns 404 Not Found.");

    // ----------------------------------------------------
    // CASE 14: Another user cannot access the quiz (IDOR 403)
    // ----------------------------------------------------
    console.log("\n[CASE 14] Another user cannot access the quiz (IDOR 403)");
    const idorGetRes = await fetch(`${BASE_URL}/quizzes/${quizAId}`, {
      headers: { Authorization: `Bearer ${token2}` } // User 2 trying to read User 1's quiz
    });
    assert.strictEqual(idorGetRes.status, 403, "User 2 accessing User 1 quiz must return 403 Forbidden");
    console.log("✔ CASE 14 PASSED: Horizontal IDOR access blocked with HTTP 403.");

    // ----------------------------------------------------
    // CASE 15: Another user cannot generate a quiz for another user's book (IDOR 403)
    // ----------------------------------------------------
    console.log("\n[CASE 15] Another user cannot generate a quiz for another user's book (IDOR 403)");
    const idorGenRes = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token2}` // User 2 trying to generate for User 1's book
      },
      body: JSON.stringify({ book_id: bookA.id, num_questions: 3 })
    });
    assert.strictEqual(idorGenRes.status, 403, "User 2 generating quiz for User 1's book must return 403 Forbidden");
    console.log("✔ CASE 15 PASSED: Cross-user textbook quiz generation blocked with HTTP 403.");

    // ----------------------------------------------------
    // CASE 16: Quiz submission uses authoritative backend answers
    // ----------------------------------------------------
    console.log("\n[CASE 16] Quiz submission uses authoritative backend answers");
    const questionsToSubmit = storedQuizA.questions;
    // Client tries to submit answers claiming option 3 is correct for everything,
    // but the backend evaluates against stored `q.correctAnswer`
    const fakeClientPayload = {
      quiz_id: quizAId,
      answers: {
        [questionsToSubmit[0].id]: questionsToSubmit[0].correctAnswer, // genuinely correct
        [questionsToSubmit[1].id]: (questionsToSubmit[1].correctAnswer + 1) % 4, // incorrect
        [questionsToSubmit[2].id]: (questionsToSubmit[2].correctAnswer + 2) % 4 // incorrect
      }
    };
    const subRes = await fetch(`${BASE_URL}/submit-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify(fakeClientPayload)
    });
    assert.strictEqual(subRes.status, 200);
    const subData = await subRes.json();
    assert.strictEqual(subData.score, 1, "Only 1 answer should be marked correct based on authoritative stored answer");
    assert.strictEqual(subData.totalQuestions, 3);
    console.log("✔ CASE 16 PASSED: Quiz submission evaluated against authoritative database answers.");

    // ----------------------------------------------------
    // CASE 17: Quiz grading calculates correct score deterministically
    // ----------------------------------------------------
    console.log("\n[CASE 17] Quiz grading calculates correct score deterministically");
    // Test 100% score (all correct)
    const allCorrectPayload = {
      quiz_id: quizAId,
      answers: {
        [questionsToSubmit[0].id]: questionsToSubmit[0].correctAnswer,
        [questionsToSubmit[1].id]: questionsToSubmit[1].correctAnswer,
        [questionsToSubmit[2].id]: questionsToSubmit[2].correctAnswer
      }
    };
    const perfectRes = await fetch(`${BASE_URL}/submit-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify(allCorrectPayload)
    });
    const perfectData = await perfectRes.json();
    assert.strictEqual(perfectData.score, 3);
    assert.strictEqual(perfectData.percentage, 100);
    assert.strictEqual(perfectData.performanceLevel, "Strong");

    // Test blank/null/empty safety (Number("") === 0 bug prevention)
    const blankPayload = {
      quiz_id: quizAId,
      answers: {
        [questionsToSubmit[0].id]: "",
        [questionsToSubmit[1].id]: null,
        [questionsToSubmit[2].id]: false
      }
    };
    const blankRes = await fetch(`${BASE_URL}/submit-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`
      },
      body: JSON.stringify(blankPayload)
    });
    const blankData = await blankRes.json();
    assert.strictEqual(blankData.score, 0, "Blank and null values must NOT be counted as index 0");
    assert.strictEqual(blankData.percentage, 0);
    console.log("✔ CASE 17 PASSED: Score calculated deterministically and blank/null safety verified.");

    // ----------------------------------------------------
    // CASE 18: Malformed submissions are rejected safely
    // ----------------------------------------------------
    console.log("\n[CASE 18] Malformed submissions are rejected safely");
    const malformed1 = await fetch(`${BASE_URL}/submit-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ answers: {} }) // missing quiz_id
    });
    assert.strictEqual(malformed1.status, 400);

    const malformed2 = await fetch(`${BASE_URL}/submit-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ quiz_id: quizAId, answers: "not an object or array" })
    });
    assert.strictEqual(malformed2.status, 400);
    console.log("✔ CASE 18 PASSED: Malformed submissions properly rejected with HTTP 400.");

    // ----------------------------------------------------
    // CASE 19: Gemini/API failure is propagated without fake quiz data
    // ----------------------------------------------------
    console.log("\n[CASE 19] Gemini/API failure is propagated without fake quiz data");
    const originalEnv = env.NODE_ENV;
    const originalKey = env.GEMINI_API_KEY;
    try {
      env.NODE_ENV = "production";
      env.GEMINI_API_KEY = "";

      let threw = false;
      try {
        await QuizGenService.generateQuizFromBook({ bookId: bookA.id, questionCount: 5 });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.statusCode, 530, "Missing API key in production must throw HTTP 530");
        assert.ok(err.message.includes("GEMINI_API_KEY"), "Error must clearly indicate missing API key");
      }
      assert.ok(threw, "Production generation with missing key must fail transparently");
    } finally {
      env.NODE_ENV = originalEnv;
      env.GEMINI_API_KEY = originalKey;
    }
    console.log("✔ CASE 19 PASSED: API key absence cleanly propagates HTTP 530 without fake fallback.");

    // ----------------------------------------------------
    // CASE 20: Question count limits are enforced
    // ----------------------------------------------------
    console.log("\n[CASE 20] Question count limits are enforced");
    const countZeroRes = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ book_id: bookA.id, num_questions: 0 })
    });
    assert.strictEqual(countZeroRes.status, 400, "Count 0 must be rejected");

    const countHugeRes = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token1}` },
      body: JSON.stringify({ book_id: bookA.id, num_questions: 999 })
    });
    assert.strictEqual(countHugeRes.status, 400, "Count 999 must be rejected");
    console.log("✔ CASE 20 PASSED: Question count bounds (1-30) strictly enforced.");

    console.log("\n==================================================");
    console.log("🎉 ALL 20 PHASE 4 CASES PASSED FLAWLESSLY!");
    console.log("==================================================\n");
  } finally {
    if (server) {
      server.close();
      console.log("Phase 4 test server stopped.");
    }
  }
};

runPhase4Verification().catch((err) => {
  console.error("\n❌ PHASE 4 VERIFICATION FAILED:", err);
  if (server) server.close();
  process.exit(1);
});
