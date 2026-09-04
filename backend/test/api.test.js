import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { app } from "../src/app.js";
import { initDb, dbRun } from "../src/config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5556;
let server;
const BASE_URL = `http://localhost:${PORT}/api`;

const runTests = async () => {
  console.log("\n🧪 Starting Comprehensive LearnAI Backend Integration Test Suite...\n");
  
  // 1. Initialize Database
  await initDb();

  // Clear previous test records for clean idempotent runs
  await dbRun("DELETE FROM users WHERE email_or_mobile LIKE '%test%' OR email_or_mobile LIKE '%turing%' OR email_or_mobile = '9876543210'");

  server = app.listen(PORT);
  console.log(` Test server running on port ${PORT}`);

  try {
    // Test 1: Health Check
    console.log("\n[Test 1] Health Check Endpoint");
    const healthRes = await fetch(`http://localhost:${PORT}/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthRes.status, 200);
    assert.strictEqual(healthData.status, "healthy");
    console.log("✔ GET /health returned 200 OK");

    // Test 2: Google Authentication
    console.log("\n[Test 2] POST /auth/google (Google OAuth Login/Signup)");
    const testEmail = `alan.turing.${Date.now()}@cambridge.edu`;
    const googleRes = await fetch(`${BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Alan Turing",
        email: testEmail,
        department: "Computer Science & Engineering (CSE)"
      })
    });
    const googleData = await googleRes.json();
    assert.strictEqual(googleRes.status, 200);
    assert.ok(googleData.token, "Token should be issued");
    assert.strictEqual(googleData.user.name, "Dr. Alan Turing");
    assert.strictEqual(googleData.user.preferred_language, "en");
    console.log("✔ POST /auth/google successfully created user and issued JWT");
    const googleToken = googleData.token;
    const googleUserId = googleData.user.id;

    // Test 3: Verify Zero-Initialized Stats for New Account
    console.log("\n[Test 3] GET /progress/:user_id & GET /activity/:user_id (Zero-State Guarantee)");
    const progressRes = await fetch(`${BASE_URL}/progress/${googleUserId}`, {
      headers: { Authorization: `Bearer ${googleToken}` }
    });
    const progressData = await progressRes.json();
    assert.strictEqual(progressRes.status, 200);
    assert.strictEqual(progressData.stats.booksStudied, 0);
    assert.strictEqual(progressData.stats.summariesGenerated, 0);
    assert.strictEqual(progressData.stats.quizzesCompleted, 0);
    assert.strictEqual(progressData.stats.averageScore, 0);
    assert.strictEqual(progressData.subjectProgress.length, 0);
    console.log("✔ New user progress starts at exactly 0 books, 0 summaries, 0 quizzes, 0 avg score");

    const activityRes = await fetch(`${BASE_URL}/activity/${googleUserId}`, {
      headers: { Authorization: `Bearer ${googleToken}` }
    });
    const activityData = await activityRes.json();
    assert.strictEqual(activityRes.status, 200);
    assert.deepStrictEqual(activityData.activities, []);
    console.log("✔ New user activity log is strictly empty [] (no default/demo data)");

    // Test 4: Mobile OTP Authentication Flow
    console.log("\n[Test 4] Mobile OTP Flow: POST /auth/mobile/send-otp & POST /auth/mobile/verify-otp");
    const testMobile = "9876543210";
    const sendOtpRes = await fetch(`${BASE_URL}/auth/mobile/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: testMobile })
    });
    const sendOtpData = await sendOtpRes.json();
    assert.strictEqual(sendOtpRes.status, 200);
    assert.ok(sendOtpData.data.devOtp, "Dev OTP should be available for test");
    const otpCode = sendOtpData.data.devOtp;
    console.log(`✔ POST /auth/mobile/send-otp dispatched code ${otpCode}`);

    const verifyOtpRes = await fetch(`${BASE_URL}/auth/mobile/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mobile: testMobile,
        otp: otpCode,
        department: "Information Technology (IT)"
      })
    });
    const verifyOtpData = await verifyOtpRes.json();
    assert.strictEqual(verifyOtpRes.status, 200);
    assert.ok(verifyOtpData.token, "Mobile token should be issued");
    assert.strictEqual(verifyOtpData.user.login_method, "mobile");
    console.log("✔ POST /auth/mobile/verify-otp verified successfully with consistent JWT format");

    // Test 5: Profile Update (PUT /profile)
    console.log("\n[Test 5] PUT /profile (Update Role & Preferred Language to Tamil)");
    const profileRes = await fetch(`${BASE_URL}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({
        role: "Information Technology (IT)",
        preferred_language: "ta" // Tamil
      })
    });
    const profileData = await profileRes.json();
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileData.user.preferred_language, "ta");
    assert.strictEqual(profileData.user.role, "Information Technology (IT)");
    console.log("✔ PUT /profile updated preferred_language to 'ta' (Tamil)");

    // Test 6: Book Upload (POST /upload-book)
    console.log("\n[Test 6] POST /upload-book (File Upload & Ingestion)");
    const sampleTextbookPath = path.join(__dirname, "sample_textbook.txt");
    fs.writeFileSync(sampleTextbookPath, "Chapter 1: Transmission Control Protocol (TCP). Three-way handshake: SYN, SYN-ACK, ACK. Flow control and Congestion control mechanisms.");

    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(sampleTextbookPath)], { type: "text/plain" });
    formData.append("file", fileBlob, "Computer_Networks_Tanenbaum.txt");
    formData.append("title", "Computer Networks & Systems");
    formData.append("subject", "Computer Networks");

    const uploadRes = await fetch(`${BASE_URL}/upload-book`, {
      method: "POST",
      headers: { Authorization: `Bearer ${googleToken}` },
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadRes.status, 201);
    assert.ok(uploadData.book_id, "book_id should be returned");
    const bookId = uploadData.book_id;
    console.log(`✔ POST /upload-book uploaded textbook successfully (book_id: ${bookId})`);

    // Clean up sample file
    if (fs.existsSync(sampleTextbookPath)) fs.unlinkSync(sampleTextbookPath);

    // Test 7: Multilingual Summarization (POST /summarize)
    console.log("\n[Test 7] POST /summarize (AI Summarization dynamically applying preferred_language)");
    const summarizeRes = await fetch(`${BASE_URL}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({ book_id: bookId })
    });
    const summarizeData = await summarizeRes.json();
    assert.strictEqual(summarizeRes.status, 200);
    assert.strictEqual(summarizeData.language, "ta");
    assert.ok(summarizeData.summary.summary_text.includes("டிரான்ஸ்மிஷன்") || summarizeData.summary.summary_text.length > 20);
    assert.ok(summarizeData.summary.audioUrl, "Audio URL should be synthesized");
    console.log("✔ POST /summarize dynamically respected user's preferred_language ('ta')");

    // Test 8: Multilingual Text-to-Speech (POST /text-to-speech)
    console.log("\n[Test 8] POST /text-to-speech (Voice Model dynamically matching language)");
    const ttsRes = await fetch(`${BASE_URL}/text-to-speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({
        text: "டிரான்ஸ்மிஷன் கண்ட்ரோல் புரோட்டோகால் ஒரு இணைப்பு சார்ந்த நெறிமுறை."
      })
    });
    const ttsData = await ttsRes.json();
    assert.strictEqual(ttsRes.status, 200);
    assert.strictEqual(ttsData.language, "ta-IN");
    assert.strictEqual(ttsData.voiceModel, "ta-IN-Standard-A");
    assert.ok(ttsData.audioUrl.startsWith("/uploads/"));
    console.log("✔ POST /text-to-speech synthesized audio using correct Indian language voice model (ta-IN)");

    // Test 9: Adaptive Quiz Generation (POST /generate-quiz)
    console.log("\n[Test 9] POST /generate-quiz (Configurable Question Bank)");
    const quizGenRes = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({
        book_id: bookId,
        num_questions: 5
      })
    });
    const quizGenData = await quizGenRes.json();
    assert.strictEqual(quizGenRes.status, 201);
    assert.strictEqual(quizGenData.quiz.questions.length, 5);
    const quizId = quizGenData.quiz_id;
    console.log(`✔ POST /generate-quiz generated 5-question adaptive quiz (quiz_id: ${quizId})`);

    // Test 10: Quiz Submission & Adaptive Grading (POST /submit-quiz)
    console.log("\n[Test 10] POST /submit-quiz (Evaluation, Scoring, and Progress Recalculation)");
    const answers = {};
    quizGenData.quiz.questions.forEach((q, idx) => {
      answers[q.id] = idx < 4 ? q.correctAnswer : (q.correctAnswer + 1) % 4;
    });

    const submitRes = await fetch(`${BASE_URL}/submit-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${googleToken}`
      },
      body: JSON.stringify({
        quiz_id: quizId,
        answers: answers
      })
    });
    const submitData = await submitRes.json();
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitData.score, 4);
    assert.strictEqual(submitData.percentage, 80);
    assert.strictEqual(submitData.performanceLevel, "Strong");
    console.log(`✔ POST /submit-quiz scored 4/5 (80% - Strong)`);

    // Test 11: Progress Analytics & Activity Feed after Learning Events
    console.log("\n[Test 11] GET /progress/:user_id & GET /activity/:user_id (Active Analytics)");
    const updatedProgRes = await fetch(`${BASE_URL}/progress/${googleUserId}`, {
      headers: { Authorization: `Bearer ${googleToken}` }
    });
    const updatedProgData = await updatedProgRes.json();
    assert.strictEqual(updatedProgData.stats.booksStudied, 1);
    assert.strictEqual(updatedProgData.stats.summariesGenerated, 1);
    assert.strictEqual(updatedProgData.stats.quizzesCompleted, 1);
    assert.strictEqual(updatedProgData.stats.averageScore, 80);
    assert.strictEqual(updatedProgData.subjectProgress.length, 1);
    console.log("✔ Progress accurately updated: 1 book, 1 summary, 1 quiz, 80% average score");

    const updatedActRes = await fetch(`${BASE_URL}/activity/${googleUserId}`, {
      headers: { Authorization: `Bearer ${googleToken}` }
    });
    const updatedActData = await updatedActRes.json();
    assert.strictEqual(updatedActData.activities.length, 3);
    console.log(`✔ Activity log populated with ${updatedActData.activities.length} real user actions`);

    // Test 12: Adaptive Learning Recommendations (GET /recommendations/:user_id)
    console.log("\n[Test 12] GET /recommendations/:user_id (AI-Driven Recommendations)");
    const recRes = await fetch(`${BASE_URL}/recommendations/${googleUserId}`, {
      headers: { Authorization: `Bearer ${googleToken}` }
    });
    const recData = await recRes.json();
    assert.strictEqual(recRes.status, 200);
    assert.ok(recData.recommendations.length > 0);
    console.log(`✔ GET /recommendations returned personalized learning recommendations: '${recData.recommendations[0].topic}'`);

    // Test 13: Security & Validation Tests
    console.log("\n[Test 13] Security & Input Validation Tests");
    const unauthRes = await fetch(`${BASE_URL}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid_token_12345"
      },
      body: JSON.stringify({ book_id: "nonexistent" })
    });
    assert.strictEqual(unauthRes.status, 401);
    console.log("✔ Reject unauthorized request with 401");

    const invalidMobileRes = await fetch(`${BASE_URL}/auth/mobile/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: "123" })
    });
    assert.strictEqual(invalidMobileRes.status, 400);
    console.log("✔ Reject invalid mobile number with 400 validation error");

    console.log("\n ALL 13 TEST SUITES PASSED FLAWLESSLY!\n");
  } finally {
    if (server) {
      server.close();
    }
  }
};

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Test suite failed with error:", err);
    if (server) server.close();
    process.exit(1);
  });
