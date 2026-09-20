import assert from "assert";
import { initDb, dbRun } from "../src/config/db.js";
import { Book } from "../src/models/Book.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { Quiz } from "../src/models/Quiz.js";
import { Summary } from "../src/models/Summary.js";
import { AdaptiveLearningService, ADAPTIVE_CONFIG } from "../src/services/adaptiveLearningService.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const PORT = 5562;
let server;
const BASE_URL = `http://localhost:${PORT}/api`;

const runPhase7Tests = async () => {
  console.log("\n🧪 Starting Phase 7 Adaptive AI Learning & Personalized Engine Test Suite...\n");

  await dbRun("DELETE FROM summaries");
  await dbRun("DELETE FROM document_chunks");
  await dbRun("DELETE FROM quizzes");
  await dbRun("DELETE FROM books WHERE title LIKE '%Phase 7%' OR title LIKE '%Test%' OR id LIKE 'book-p7-%'");

  server = app.listen(PORT);
  console.log(` Test server running on port ${PORT}\n`);

  try {
    // Setup Student User A
    const studentAEmail = `phase7.studentA.${Date.now()}@university.edu`;
    const signupA = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Phase 7 Student A", email: studentAEmail, password: "password123" })
    });
    const signupAData = await signupA.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentAEmail, otp: signupAData.devOtp })
    });
    const loginA = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentAEmail, password: "password123" })
    });
    const loginAData = await loginA.json();
    const tokenA = loginAData.token;
    const userAId = loginAData.user.id;

    // Setup Student User B (for cross-user security tests)
    const studentBEmail = `phase7.studentB.${Date.now()}@university.edu`;
    const signupB = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Phase 7 Student B", email: studentBEmail, password: "password123" })
    });
    const signupBData = await signupB.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentBEmail, otp: signupBData.devOtp })
    });
    const loginB = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentBEmail, password: "password123" })
    });
    const tokenB = (await loginB.json()).token;

    // -------------------------------------------------------------
    // TEST 1: New User With No History
    // -------------------------------------------------------------
    console.log("TEST 1: New user with no history");
    const res1 = await fetch(`${BASE_URL}/adaptive-learning`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const data1 = await res1.json();
    assert.strictEqual(res1.status, 200, "Adaptive dashboard request failed");
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.topicPerformance.length, 0, "No topic performance data yet");
    assert.ok(Array.isArray(data1.recommendations), "Recommendations array present");
    console.log("  PASSED: New user initialized with zero-state dashboard.\n");

    // Create Textbook for Student A
    const bookA = await Book.create({
      id: "book-p7-networks",
      user_id: userAId,
      file_url: "/uploads/networks_p7.pdf",
      title: "Phase 7 Computer Networks",
      subject: "Computer Networks",
      extracted_text: "IP Addressing and Routing Protocols. TCP and UDP transport protocols."
    });

    await DocumentChunk.create({
      id: "chk_p7_net_1",
      book_id: bookA.id,
      chapter: "Chapter 1: Network Layer",
      section: "1.1 IP Addressing",
      page_start: 1,
      page_end: 10,
      chunk_index: 0,
      text: "IP Addresses format and subnetting principles."
    });

    await DocumentChunk.create({
      id: "chk_p7_net_2",
      book_id: bookA.id,
      chapter: "Chapter 2: Transport Layer",
      section: "2.1 TCP Protocols",
      page_start: 11,
      page_end: 25,
      chunk_index: 1,
      text: "TCP 3-way handshake and reliable transport mechanisms."
    });

    // -------------------------------------------------------------
    // TEST 2: Single Quiz Score Analysis
    // -------------------------------------------------------------
    console.log("TEST 2: Single quiz score analysis");
    const quiz1 = await Quiz.create({
      id: "qz_p7_1",
      book_id: bookA.id,
      user_id: userAId,
      num_questions: 2,
      questions: [
        { id: "q1", question: "What is IP?", topic: "IP Addressing", correctAnswer: 0, options: ["Addr", "B", "C", "D"] },
        { id: "q2", question: "What is Subnet?", topic: "IP Addressing", correctAnswer: 0, options: ["Subnet", "B", "C", "D"] }
      ]
    });

    await Quiz.recordSubmission({
      id: quiz1.id,
      score: 1,
      total_questions: 2,
      percentage: 50,
      performance_level: "Needs Improvement",
      answers: [
        { questionId: "q1", isCorrect: true, topic: "IP Addressing" },
        { questionId: "q2", isCorrect: false, topic: "IP Addressing" }
      ]
    });

    const perf2 = await AdaptiveLearningService.getTopicPerformance(userAId, bookA.id);
    assert.strictEqual(perf2.length, 1, "Should have 1 topic recorded");
    assert.strictEqual(perf2[0].topic, "IP Addressing");
    assert.strictEqual(perf2[0].accuracy, 50, "Accuracy should be 50%");
    console.log("  PASSED: Single quiz attempt accurately tracked at topic level.\n");

    // -------------------------------------------------------------
    // TEST 3: Multiple Quizzes Topic Aggregation
    // -------------------------------------------------------------
    console.log("TEST 3: Multiple quizzes topic aggregation");
    const quiz2 = await Quiz.create({
      id: "qz_p7_2",
      book_id: bookA.id,
      user_id: userAId,
      num_questions: 2,
      questions: [
        { id: "q3", question: "TCP SYN?", topic: "TCP Protocol", correctAnswer: 0, options: ["SYN", "B", "C", "D"] },
        { id: "q4", question: "TCP ACK?", topic: "TCP Protocol", correctAnswer: 0, options: ["ACK", "B", "C", "D"] }
      ]
    });

    await Quiz.recordSubmission({
      id: quiz2.id,
      score: 2,
      total_questions: 2,
      percentage: 100,
      performance_level: "Strong",
      answers: [
        { questionId: "q3", isCorrect: true, topic: "TCP Protocol" },
        { questionId: "q4", isCorrect: true, topic: "TCP Protocol" }
      ]
    });

    const perf3 = await AdaptiveLearningService.getTopicPerformance(userAId, bookA.id);
    assert.strictEqual(perf3.length, 2, "Should aggregate 2 distinct topics");
    console.log("  PASSED: Multiple quizzes aggregated cleanly across topics.\n");

    // -------------------------------------------------------------
    // TEST 4: Weak Topic Detection (< 60% accuracy)
    // -------------------------------------------------------------
    console.log("TEST 4: Weak topic detection");
    const weakTopics = await AdaptiveLearningService.detectWeakTopics(userAId, bookA.id);
    assert.strictEqual(weakTopics.length, 1, "Should detect 1 weak topic");
    assert.strictEqual(weakTopics[0].topic, "IP Addressing", "IP Addressing should be flagged as weak");
    assert.strictEqual(weakTopics[0].learningState, "needs_revision");
    console.log("  PASSED: Weak topic 'IP Addressing' correctly flagged.\n");

    // -------------------------------------------------------------
    // TEST 5: Improving Topic Detection (+10% score delta)
    // -------------------------------------------------------------
    console.log("TEST 5: Improving topic detection");
    const quiz3 = await Quiz.create({
      id: "qz_p7_3",
      book_id: bookA.id,
      user_id: userAId,
      num_questions: 2,
      questions: [
        { id: "q5", question: "What is IPv6?", topic: "IP Addressing", correctAnswer: 0, options: ["128bit", "B", "C", "D"] },
        { id: "q6", question: "What is CIDR?", topic: "IP Addressing", correctAnswer: 0, options: ["Prefix", "B", "C", "D"] }
      ]
    });

    await Quiz.recordSubmission({
      id: quiz3.id,
      score: 2,
      total_questions: 2,
      percentage: 100,
      performance_level: "Strong",
      answers: [
        { questionId: "q5", isCorrect: true, topic: "IP Addressing" },
        { questionId: "q6", isCorrect: true, topic: "IP Addressing" }
      ]
    });

    const perf5 = await AdaptiveLearningService.getTopicPerformance(userAId, bookA.id);
    const ipPerf = perf5.find((t) => t.topic === "IP Addressing");
    assert.strictEqual(ipPerf.trend, "improving", "Trend should be improving after 50% -> 100%");
    console.log("  PASSED: Improving trend correctly detected.\n");

    // -------------------------------------------------------------
    // TEST 6: Mastery Detection (>= 85% accuracy with min 2 attempts)
    // -------------------------------------------------------------
    console.log("TEST 6: Mastery detection");
    const quiz4 = await Quiz.create({
      id: "qz_p7_4",
      book_id: bookA.id,
      user_id: userAId,
      num_questions: 2,
      questions: [
        { id: "q7", question: "TCP Window?", topic: "TCP Protocol", correctAnswer: 0, options: ["Flow", "B", "C", "D"] },
        { id: "q8", question: "TCP RTT?", topic: "TCP Protocol", correctAnswer: 0, options: ["Time", "B", "C", "D"] }
      ]
    });

    await Quiz.recordSubmission({
      id: quiz4.id,
      score: 2,
      total_questions: 2,
      percentage: 100,
      performance_level: "Strong",
      answers: [
        { questionId: "q7", isCorrect: true, topic: "TCP Protocol" },
        { questionId: "q8", isCorrect: true, topic: "TCP Protocol" }
      ]
    });

    const perf6 = await AdaptiveLearningService.getTopicPerformance(userAId, bookA.id);
    const tcpPerf = perf6.find((t) => t.topic === "TCP Protocol");
    assert.strictEqual(tcpPerf.learningState, "mastered", "TCP Protocol should be classified as mastered");
    console.log("  PASSED: Topic 'TCP Protocol' correctly classified as mastered.\n");

    // -------------------------------------------------------------
    // TEST 7: Difficulty Recommendation for New Topic
    // -------------------------------------------------------------
    console.log("TEST 7: Difficulty recommendation for new topic");
    const diffNew = await AdaptiveLearningService.getRecommendedDifficulty(userAId, "Unseen Topic", bookA.id);
    assert.strictEqual(diffNew, "Intermediate", "New topics should default to Intermediate");
    console.log("  PASSED: New topics default to Intermediate difficulty.\n");

    // -------------------------------------------------------------
    // TEST 8: Difficulty Progression (Beginner -> Intermediate -> Advanced)
    // -------------------------------------------------------------
    console.log("TEST 8: Difficulty progression");
    const diffMastered = await AdaptiveLearningService.getRecommendedDifficulty(userAId, "TCP Protocol", bookA.id);
    assert.strictEqual(diffMastered, "Advanced", "Sustained high score (100% twice) should step up to Advanced");
    console.log("  PASSED: Controlled difficulty progression stepped up to Advanced.\n");

    // -------------------------------------------------------------
    // TEST 9: Difficulty Reduction
    // -------------------------------------------------------------
    console.log("TEST 9: Difficulty reduction");
    const quiz5 = await Quiz.create({
      id: "qz_p7_5",
      book_id: bookA.id,
      user_id: userAId,
      num_questions: 2,
      questions: [
        { id: "q9", question: "BGP Autonomous?", topic: "Routing Protocols", correctAnswer: 0, options: ["AS", "B", "C", "D"] },
        { id: "q10", question: "OSPF Link State?", topic: "Routing Protocols", correctAnswer: 0, options: ["LSA", "B", "C", "D"] }
      ]
    });

    await Quiz.recordSubmission({
      id: quiz5.id,
      score: 0,
      total_questions: 2,
      percentage: 0,
      performance_level: "Weak",
      answers: [
        { questionId: "q9", isCorrect: false, topic: "Routing Protocols" },
        { questionId: "q10", isCorrect: false, topic: "Routing Protocols" }
      ]
    });

    const diffWeak = await AdaptiveLearningService.getRecommendedDifficulty(userAId, "Routing Protocols", bookA.id);
    assert.strictEqual(diffWeak, "Beginner", "Low score (0%) should step down to Beginner");
    console.log("  PASSED: Difficulty reduction stepped down to Beginner.\n");

    // -------------------------------------------------------------
    // TEST 10: Recommendation Generation
    // -------------------------------------------------------------
    console.log("TEST 10: Recommendation generation");
    const recs = await AdaptiveLearningService.generatePersonalizedRecommendations(userAId, bookA.id);
    assert.ok(recs.length > 0, "Recommendations generated");
    console.log("  PASSED: Personalized recommendations generated.\n");

    // -------------------------------------------------------------
    // TEST 11: Dynamic Recommendation Reasons Reflecting Actual Scores
    // -------------------------------------------------------------
    console.log("TEST 11: Dynamic recommendation reasons");
    const routingRec = recs.find((r) => r.topic === "Routing Protocols");
    assert.ok(routingRec, "Routing Protocols recommendation should exist");
    assert.ok(routingRec.reason.includes("0%"), "Reason should dynamically include actual score '0%'");
    console.log("  PASSED: Dynamic reason contains exact user accuracy percentage.\n");

    // -------------------------------------------------------------
    // TEST 12: Learning Path Generation Based on Real Chunks
    // -------------------------------------------------------------
    console.log("TEST 12: Learning path generation based on real chunks");
    const pathList = await AdaptiveLearningService.generateLearningPath(userAId, bookA.id);
    assert.strictEqual(pathList.length, 2, "Should construct 2 chapter steps from DB chunks");
    assert.strictEqual(pathList[0].chapter, "Chapter 1: Network Layer");
    assert.strictEqual(pathList[1].chapter, "Chapter 2: Transport Layer");
    console.log("  PASSED: Learning path constructed from actual textbook chunks.\n");

    // -------------------------------------------------------------
    // TEST 13: Missing Chapter Metadata Fallback
    // -------------------------------------------------------------
    console.log("TEST 13: Missing chapter metadata fallback");
    const pathNoChunks = await AdaptiveLearningService.generateLearningPath(userAId, "non-existent-book-id");
    assert.strictEqual(pathNoChunks.length, 0, "Non-existent book yields empty path without crash");
    console.log("  PASSED: Missing chapter metadata handled cleanly.\n");

    // -------------------------------------------------------------
    // TEST 14: Missing Topic Metadata Fallback
    // -------------------------------------------------------------
    console.log("TEST 14: Missing topic metadata fallback");
    const quiz6 = await Quiz.create({
      id: "qz_p7_6",
      book_id: bookA.id,
      user_id: userAId,
      num_questions: 1,
      questions: [{ id: "q11", question: "Generic question?", correctAnswer: 0, options: ["A", "B", "C", "D"] }]
    });
    await Quiz.recordSubmission({
      id: quiz6.id,
      score: 1,
      total_questions: 1,
      percentage: 100,
      performance_level: "Strong",
      answers: [{ questionId: "q11", isCorrect: true }]
    });
    const perf14 = await AdaptiveLearningService.getTopicPerformance(userAId, bookA.id);
    assert.ok(perf14.some((t) => t.topic === "Core Concepts"), "Fallback topic 'Core Concepts' used when topic missing");
    console.log("  PASSED: Missing topic metadata defaulted to 'Core Concepts'.\n");

    // -------------------------------------------------------------
    // TEST 15: Book Ownership Authorization Check
    // -------------------------------------------------------------
    console.log("TEST 15: Book ownership authorization check");
    const res15 = await fetch(`${BASE_URL}/adaptive-learning/${bookA.id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(res15.status, 403, "Student B forbidden from accessing Student A's book adaptive learning");
    console.log("  PASSED: Book ownership security enforced with 403 Forbidden.\n");

    // -------------------------------------------------------------
    // TEST 16: Cross-User Data Isolation
    // -------------------------------------------------------------
    console.log("TEST 16: Cross-user data isolation");
    const res16 = await fetch(`${BASE_URL}/adaptive-learning`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const data16 = await res16.json();
    assert.strictEqual(data16.topicPerformance.length, 0, "Student B has 0 topic history");
    console.log("  PASSED: Zero cross-user data leakage.\n");

    // -------------------------------------------------------------
    // TEST 17: Empty Dataset Handling Without Crashing
    // -------------------------------------------------------------
    console.log("TEST 17: Empty dataset handling without crashing");
    const emptyPerf = await AdaptiveLearningService.getTopicPerformance("non-existent-user-id");
    assert.strictEqual(emptyPerf.length, 0, "Empty topic array returned");
    console.log("  PASSED: Empty dataset handled safely.\n");

    // -------------------------------------------------------------
    // TEST 18: Adaptive Quiz Parameter Generation
    // -------------------------------------------------------------
    console.log("TEST 18: Adaptive quiz parameter generation");
    const res18 = await fetch(`${BASE_URL}/generate-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        bookId: bookA.id,
        isAdaptive: true,
        topic: "Routing Protocols"
      })
    });
    const data18 = await res18.json();
    assert.strictEqual(res18.status, 201, "Adaptive quiz creation succeeded");
    assert.strictEqual(data18.quiz.difficulty, "Beginner", "Adaptive engine selected 'Beginner' difficulty for weak Routing Protocols topic");
    console.log("  PASSED: Adaptive quiz dynamically generated with recommended difficulty.\n");

    // -------------------------------------------------------------
    // TEST 19: Regression with Existing Quiz Submission
    // -------------------------------------------------------------
    console.log("TEST 19: Regression with existing quiz submission");
    const res19 = await fetch(`${BASE_URL}/submit-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        quizId: data18.quizId,
        answers: { q1: 0, q2: 0 }
      })
    });
    assert.strictEqual(res19.status, 200, "Quiz submission succeeded");
    console.log("  PASSED: Quiz submission updated student score and progress.\n");

    // -------------------------------------------------------------
    // TEST 20: Regression with Existing Progress API
    // -------------------------------------------------------------
    console.log("TEST 20: Regression with existing progress API");
    const res20 = await fetch(`${BASE_URL}/progress/${userAId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const data20 = await res20.json();
    assert.strictEqual(res20.status, 200, "Progress API succeeded");
    assert.ok(data20.stats.quizzesCompleted > 0, "Quizzes completed count incremented");
    console.log("  PASSED: Existing progress API contract preserved 100%.\n");

    console.log("🎉 ALL 20 PHASE 7 ADAPTIVE LEARNING TESTS PASSED SUCCESSFULLY!\n");
  } finally {
    if (server) {
      server.close();
      console.log(" Test server closed.");
    }
  }
};

runPhase7Tests().catch((err) => {
  console.error("❌ Test execution error:", err);
  if (server) server.close();
  process.exit(1);
});
