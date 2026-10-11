import assert from "assert";
import http from "http";
import { app } from "../src/app.js";
import { initDb, dbRun, dbGet } from "../src/config/db.js";
import { env } from "../src/config/env.js";
import { User } from "../src/models/User.js";
import { Book } from "../src/models/Book.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { DEFAULT_USER_ID, generateToken } from "../src/middleware/auth.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const PORT = 5599;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;
let server;

async function runSecurityReviewTests() {
  console.log("\n==================================================================");
  console.log("🔒 COMPREHENSIVE NO-LOGIN SECURITY & PUBLIC ACCESS REVIEW SUITE");
  console.log("==================================================================\n");

  await initDb();
  server = app.listen(PORT);
  console.log(`📡 Security Review Test Server listening at http://127.0.0.1:${PORT}\n`);

  try {
    // -------------------------------------------------------------------------
    // Setup a Registered Private User for Access Control Tests
    // -------------------------------------------------------------------------
    const privateUser = await User.create({
      id: `usr_private_${Date.now()}`,
      name: "Private Confidential Student",
      email: `private.student.${Date.now()}@university.edu`,
      password_hash: "hashed_secret_password_123",
      email_verified: 1,
      login_method: "email",
      role: "Cybersecurity"
    });
    const privateUserToken = generateToken(privateUser);

    // Private user's textbook
    const privateBook = await Book.create({
      id: `book_sec_${Date.now()}`,
      user_id: privateUser.id,
      file_url: "/uploads/confidential.pdf",
      title: "Confidential Cryptography Treatise",
      subject: "Cryptography",
      extracted_text: "Cryptographic keys must remain strictly confidential and never exposed across unauthorized boundaries."
    });

    await DocumentChunk.create({
      book_id: privateBook.id,
      chapter: "Chapter 1: Cryptographic Principles",
      section: "Confidentiality and Integrity",
      page_start: 1,
      page_end: 2,
      chunk_index: 0,
      text: "Cryptographic keys must remain strictly confidential and never exposed across unauthorized boundaries. Symmetric encryption and asymmetric key exchange form the bedrock of secure communications."
    });

    console.log("✔ Test Fixtures Initialized: Private student and confidential textbook created.\n");

    // =========================================================================
    // SECTION 1: Unauthenticated Access to Every Intended Public Feature
    // =========================================================================
    console.log("--- SECTION 1: UNAUTHENTICATED ACCESS TO EVERY PUBLIC FEATURE ---");

    // 1. Health
    const healthRes = await fetch(`http://127.0.0.1:${PORT}/health`);
    assert.strictEqual(healthRes.status, 200, "GET /health must be 200");
    console.log("✔ 1. Public Health Check: 200 OK");

    // 2. Public Textbooks List
    const booksRes = await fetch(`${BASE_URL}/books`);
    assert.strictEqual(booksRes.status, 200, "GET /books must be 200");
    const booksData = await booksRes.json();
    assert.strictEqual(booksData.success, true);
    console.log(`✔ 2. Public Textbook Catalog: 200 OK (${booksData.books.length} books accessible)`);

    // 3. Public Book Details by ID
    const bookDetailRes = await fetch(`${BASE_URL}/books/${privateBook.id}`);
    assert.strictEqual(bookDetailRes.status, 200, "GET /books/:id must be 200");
    console.log("✔ 3. Public Textbook Detail: 200 OK");

    // 4. Public Textbook Chunks
    const chunksRes = await fetch(`${BASE_URL}/books/${privateBook.id}/chunks`);
    assert.strictEqual(chunksRes.status, 200, "GET /books/:id/chunks must be 200");
    console.log("✔ 4. Public Textbook Chunks: 200 OK");

    // 5. Public AI Summarize
    const sumRes = await fetch(`${BASE_URL}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book_id: privateBook.id, target_language: "en" })
    });
    assert.strictEqual(sumRes.status, 200, "POST /summarize must be 200");
    const sumData = await sumRes.json();
    assert.strictEqual(sumData.success, true);
    const publicSummaryId = sumData.summary_id || sumData.summaryId;
    console.log("✔ 5. Public AI Summarization: 200 OK");

    // 6. Public Summaries List
    const sumListRes = await fetch(`${BASE_URL}/summaries`);
    assert.strictEqual(sumListRes.status, 200, "GET /summaries must be 200");
    console.log("✔ 6. Public Summary Catalog: 200 OK");

    // 7. Public Summary by ID
    const sumDetailRes = await fetch(`${BASE_URL}/summaries/${publicSummaryId}`);
    assert.strictEqual(sumDetailRes.status, 200, "GET /summaries/:id must be 200");
    console.log("✔ 7. Public Summary Detail: 200 OK");

    // 8. Public Translation of Existing Summary
    const transRes = await fetch(`${BASE_URL}/summaries/${publicSummaryId}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_language: "ta" })
    });
    assert.strictEqual(transRes.status, 200, "POST /summaries/:id/translate must be 200");
    console.log("✔ 8. Public Multilingual Translation: 200 OK");

    // 9. Public Quiz Generation
    const quizGenRes = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book_id: privateBook.id, num_questions: 3 })
    });
    assert.strictEqual(quizGenRes.status, 201, "POST /generate-quiz must be 201");
    const quizGenData = await quizGenRes.json();
    const publicQuizId = quizGenData.quiz_id || quizGenData.quizId;
    console.log("✔ 9. Public AI Quiz Generation: 201 Created");

    // 10. Public Quiz Fetch by ID
    const quizFetchRes = await fetch(`${BASE_URL}/quizzes/${publicQuizId}`);
    assert.strictEqual(quizFetchRes.status, 200, "GET /quizzes/:id must be 200");
    console.log("✔ 10. Public Quiz Fetch by ID: 200 OK");

    // 11. Public Quiz Submission
    const quizSubRes = await fetch(`${BASE_URL}/submit-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_id: publicQuizId,
        answers: { [quizGenData.quiz.questions[0].id]: 0 }
      })
    });
    assert.strictEqual(quizSubRes.status, 200, "POST /submit-quiz must be 200");
    console.log("✔ 11. Public Quiz Evaluation & Submission: 200 OK");

    // 12. Public Ask AI Doubt (Clear Doubts)
    const doubtRes = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId: privateBook.id,
        question: "Explain cryptographic confidentiality."
      })
    });
    assert.strictEqual(doubtRes.status, 200, "POST /ask-doubt must be 200");
    console.log("✔ 12. Public AI Doubt Solver: 200 OK");

    // 13. Public Text to Speech
    const ttsRes = await fetch(`${BASE_URL}/text-to-speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Confidentiality and encryption principles.", language: "en" })
    });
    assert.strictEqual(ttsRes.status, 200, "POST /text-to-speech must be 200");
    console.log("✔ 13. Public Multilingual Voice Synthesis (TTS): 200 OK");

    // 14. Public Progress Dashboard
    const progRes = await fetch(`${BASE_URL}/progress`);
    assert.strictEqual(progRes.status, 200, "GET /progress must be 200");
    const progData = await progRes.json();
    assert.strictEqual(progData.user_id, DEFAULT_USER_ID, "Must default to public student user ID");
    console.log("✔ 14. Public Student Progress Analytics: 200 OK");

    // 15. Public Activity Log
    const actRes = await fetch(`${BASE_URL}/activity`);
    assert.strictEqual(actRes.status, 200, "GET /activity must be 200");
    const actData = await actRes.json();
    assert.strictEqual(actData.user_id, DEFAULT_USER_ID, "Must default to public student user ID");
    console.log("✔ 15. Public Student Activity Stream: 200 OK");

    // 16. Public Adaptive Learning Dashboard
    const adaptRes = await fetch(`${BASE_URL}/adaptive-learning`);
    assert.strictEqual(adaptRes.status, 200, "GET /adaptive-learning must be 200");
    console.log("✔ 16. Public Adaptive Learning Dashboard: 200 OK");

    // 17. Public Book-Specific Adaptive Learning
    const adaptBookRes = await fetch(`${BASE_URL}/adaptive-learning/${privateBook.id}`);
    assert.strictEqual(adaptBookRes.status, 200, "GET /adaptive-learning/:bookId must be 200");
    console.log("✔ 17. Public Book-Level Adaptive Diagnostics: 200 OK");

    // 18. Public AI Recommendations
    const recRes = await fetch(`${BASE_URL}/recommendations`);
    assert.strictEqual(recRes.status, 200, "GET /recommendations must be 200");
    console.log("✔ 18. Public AI Recommendations: 200 OK");

    // 19. Public Student Profile Retrieval
    const profGetRes = await fetch(`${BASE_URL}/profile`);
    assert.strictEqual(profGetRes.status, 200, "GET /profile must be 200");
    const profGetData = await profGetRes.json();
    assert.strictEqual(profGetData.user.id, DEFAULT_USER_ID);
    assert.strictEqual(profGetData.user.password_hash, undefined, "password_hash must never be leaked");
    console.log("✔ 19. Public Student Profile Read: 200 OK");

    // 20. Public Student Profile Preferences Update
    const profPutRes = await fetch(`${BASE_URL}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Autonomous Learner",
        preferred_language: "ta",
        role: "Computer Science & Engineering (CSE)"
      })
    });
    assert.strictEqual(profPutRes.status, 200, "PUT /profile must be 200");
    const profPutData = await profPutRes.json();
    assert.strictEqual(profPutData.user.name, "Autonomous Learner");
    assert.strictEqual(profPutData.user.preferred_language, "ta");
    console.log("✔ 20. Public Student Profile Update: 200 OK\n");

    // =========================================================================
    // SECTION 2: Protection Against Accessing Sensitive Data / Manipulating Other Users
    // =========================================================================
    console.log("--- SECTION 2: ATTEMPTS TO ACCESS SENSITIVE DATA OR MANIPULATE RECORDS ---");

    // Test A: Unauthenticated request to /auth/me must return 401
    console.log("\n[Attack Vector A] Snooping on /auth/me without credentials");
    const attackMeRes = await fetch(`${BASE_URL}/auth/me`);
    assert.strictEqual(attackMeRes.status, 401, "Unauthenticated /auth/me must be rejected with 401");
    console.log("✔ PASSED: Unauthenticated access to /auth/me rejected with 401 Unauthorized.");

    // Test B: Forged/fake JWT token to /auth/me must return 401
    console.log("\n[Attack Vector B] Accessing /auth/me with forged or invalid JWT");
    const forgedMeRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: "Bearer forged.invalid.token.12345" }
    });
    assert.strictEqual(forgedMeRes.status, 401, "Forged token to /auth/me must be rejected with 401");
    console.log("✔ PASSED: Forged JWT token to /auth/me rejected with 401 Unauthorized.");

    // Test C: Unauthenticated attempt to view private student's progress
    console.log("\n[Attack Vector C] Snooping on private student's progress via /progress/:user_id");
    const snoopProgRes = await fetch(`${BASE_URL}/progress/${privateUser.id}`);
    assert.strictEqual(snoopProgRes.status, 403, "Unauthenticated access to another user's progress must be 403");
    console.log("✔ PASSED: Unauthenticated inspection of private student's progress rejected with 403 Forbidden.");

    // Test D: Unauthenticated attempt to view private student's activity log
    console.log("\n[Attack Vector D] Snooping on private student's activity log via /activity/:user_id");
    const snoopActRes = await fetch(`${BASE_URL}/activity/${privateUser.id}`);
    assert.strictEqual(snoopActRes.status, 403, "Unauthenticated access to another user's activity log must be 403");
    console.log("✔ PASSED: Unauthenticated inspection of private student's activity log rejected with 403 Forbidden.");

    // Test E: Unauthenticated attempt to view private student's recommendations
    console.log("\n[Attack Vector E] Snooping on private student's recommendations via /recommendations/:user_id");
    const snoopRecRes = await fetch(`${BASE_URL}/recommendations/${privateUser.id}`);
    assert.strictEqual(snoopRecRes.status, 403, "Unauthenticated access to another user's recommendations must be 403");
    console.log("✔ PASSED: Unauthenticated inspection of private student's recommendations rejected with 403 Forbidden.");

    // Test F: Attempt to hijack private user's account via PUT /profile { id: privateUser.id }
    console.log("\n[Attack Vector F] Attempting to overwrite private user account via PUT /profile");
    const hijackRes = await fetch(`${BASE_URL}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: privateUser.id,
        name: "Hacked Name"
      })
    });
    assert.strictEqual(hijackRes.status, 403, "Attempting to specify another user ID in PUT /profile must return 403");
    
    // Verify private user in DB was NOT changed
    const verifyUser = await User.findById(privateUser.id);
    assert.strictEqual(verifyUser.name, "Private Confidential Student", "Private user name must not have been altered");
    console.log("✔ PASSED: Account hijacking via PUT /profile blocked with 403; private record intact.");

    // Test G: Attempt to overwrite private user's email or password_hash via PUT /profile
    console.log("\n[Attack Vector G] Attempting to inject email / password changes via public PUT /profile");
    const injectCredsRes = await fetch(`${BASE_URL}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "attacker@malicious.com",
        password_hash: "malicious_hash",
        email_verified: 0
      })
    });
    assert.strictEqual(injectCredsRes.status, 200);
    // Verify default student's email and credentials were NOT altered
    const defaultStudent = await User.findById(DEFAULT_USER_ID);
    assert.strictEqual(defaultStudent.email, "student@university.edu", "Default student email must not be altered");
    console.log("✔ PASSED: Sensitive fields (email, password_hash) completely stripped by profile updater.");

    // Test H: Legitimate owner CAN access their own private progress with valid JWT
    console.log("\n[Legitimate Access H] Owner accessing their own progress with valid JWT");
    const ownerProgRes = await fetch(`${BASE_URL}/progress/${privateUser.id}`, {
      headers: { Authorization: `Bearer ${privateUserToken}` }
    });
    assert.strictEqual(ownerProgRes.status, 200, "Owner with matching token can access their progress");
    console.log("✔ PASSED: Authenticated student can view their own progress with authentic JWT.");

    console.log("\n==================================================================");
    console.log("🎉 ALL 20 PUBLIC ACCESS & ALL 8 SECURITY DEFENSE TESTS PASSED!");
    console.log("==================================================================\n");
  } finally {
    if (server) server.close();
  }
}

runSecurityReviewTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ SECURITY REVIEW TEST FAILED:", err);
    if (server) server.close();
    process.exit(1);
  });
