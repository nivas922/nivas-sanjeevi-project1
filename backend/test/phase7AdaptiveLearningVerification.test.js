import assert from "assert";
import { initDb, dbRun } from "../src/config/db.js";
import { Book } from "../src/models/Book.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { Quiz } from "../src/models/Quiz.js";
import { User } from "../src/models/User.js";
import { AdaptiveLearningService, ADAPTIVE_CONFIG } from "../src/services/adaptiveLearningService.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const PORT = 5588;
let server;
const BASE_URL = `http://localhost:${PORT}/api`;

const runVerificationTests = async () => {
  console.log("\n🧪 Running Phase 7 Adaptive Personalized Learning Verification Test Suite...\n");

  await initDb();
  await dbRun("DELETE FROM summaries");
  await dbRun("DELETE FROM document_chunks");
  await dbRun("DELETE FROM quizzes WHERE user_id LIKE 'usr_p7v_%'");
  await dbRun("DELETE FROM books WHERE id LIKE 'book_p7v_%'");
  await dbRun("DELETE FROM users WHERE id LIKE 'usr_p7v_%'");

  server = app.listen(PORT);
  console.log(` Test server listening on port ${PORT}\n`);

  try {
    // -------------------------------------------------------------
    // SETUP: Create Student A and Student B
    // -------------------------------------------------------------
    const studentAEmail = `p7v.studentA.${Date.now()}@university.edu`;
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

    const studentBEmail = `p7v.studentB.${Date.now()}@university.edu`;
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
    const loginBData = await loginB.json();
    const tokenB = loginBData.token;
    const userBId = loginBData.user.id;

    // Create Book 1 (Networks) and Book 2 (Biology) for Student A
    const book1 = await Book.create({
      id: `book_p7v_net_${Date.now()}`,
      user_id: userAId,
      file_url: "/uploads/p7v_networks.pdf",
      title: "Computer Networks Systems",
      subject: "Computer Networks",
      extracted_text: "TCP and UDP transport protocols. Subnetting and CIDR principles."
    });

    const book2 = await Book.create({
      id: `book_p7v_bio_${Date.now()}`,
      user_id: userAId,
      file_url: "/uploads/p7v_biology.pdf",
      title: "Cell Biology Fundamentals",
      subject: "Biology",
      extracted_text: "Mitochondria and cellular respiration. Ribosomes and protein synthesis."
    });

    // -------------------------------------------------------------
    // TEST 1: Authenticated Adaptive Request
    // -------------------------------------------------------------
    console.log("TEST 1: Authenticated adaptive request");
    const res1 = await fetch(`${BASE_URL}/adaptive-learning`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const data1 = await res1.json();
    assert.strictEqual(res1.status, 200, "Authenticated adaptive request must return 200");
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.user_id, userAId);
    console.log("  PASSED: Authenticated adaptive request succeeded.\n");

    // -------------------------------------------------------------
    // TEST 2: Unauthenticated Request
    // -------------------------------------------------------------
    console.log("TEST 2: Unauthenticated request");
    const res2 = await fetch(`${BASE_URL}/adaptive-learning`);
    assert.strictEqual(res2.status, 401, "Unauthenticated adaptive request must return 401");
    console.log("  PASSED: Unauthenticated request correctly rejected with 401.\n");

    // -------------------------------------------------------------
    // TEST 3: Empty Learning History
    // -------------------------------------------------------------
    console.log("TEST 3: Empty learning history");
    assert.strictEqual(data1.topicPerformance.length, 0, "No topic performance for fresh user");
    assert.strictEqual(data1.totalQuizzesTaken, 0, "Zero quizzes taken for fresh user");
    assert.strictEqual(data1.recommendations.length, 0, "Recommendations must be empty for fresh user");
    assert.strictEqual(data1.insufficientHistory, true, "insufficientHistory flag should be true");
    console.log("  PASSED: Empty learning history returns clean zero-state without inventing data.\n");

    // -------------------------------------------------------------
    // TEST 4: Single Quiz Attempt
    // -------------------------------------------------------------
    console.log("TEST 4: Single quiz attempt");
    const quiz1 = await Quiz.create({
      id: `qz_p7v_1_${Date.now()}`,
      book_id: book1.id,
      user_id: userAId,
      num_questions: 2,
      questions: [
        { id: "q1", question: "What is TCP?", topic: "TCP Protocol", correctAnswer: 0, options: ["Reliable", "B", "C", "D"] },
        { id: "q2", question: "What is UDP?", topic: "TCP Protocol", correctAnswer: 0, options: ["Fast", "B", "C", "D"] }
      ]
    });
    await Quiz.recordSubmission({
      id: quiz1.id,
      score: 1,
      total_questions: 2,
      percentage: 50,
      performance_level: "Needs Improvement",
      answers: [
        { questionId: "q1", isCorrect: true, topic: "TCP Protocol" },
        { questionId: "q2", isCorrect: false, topic: "TCP Protocol" }
      ]
    });

    const perf4 = await AdaptiveLearningService.getTopicPerformance(userAId, book1.id);
    assert.strictEqual(perf4.length, 1, "Single quiz should yield 1 topic");
    assert.strictEqual(perf4[0].topic, "TCP Protocol");
    assert.strictEqual(perf4[0].attempts, 1, "Attempts should be 1");
    assert.strictEqual(perf4[0].accuracy, 50, "Accuracy should be 50%");
    assert.strictEqual(perf4[0].trend, "stable", "Single attempt must NOT claim improvement or decline");
    console.log("  PASSED: Single quiz attempt analyzed correctly without spurious trends.\n");

    // -------------------------------------------------------------
    // TEST 5: Multiple Quiz History Aggregation
    // -------------------------------------------------------------
    console.log("TEST 5: Multiple quiz history aggregation");
    const quiz2 = await Quiz.create({
      id: `qz_p7v_2_${Date.now()}`,
      book_id: book1.id,
      user_id: userAId,
      num_questions: 2,
      questions: [
        { id: "q3", question: "TCP 3-way handshake?", topic: "TCP Protocol", correctAnswer: 0, options: ["SYN-ACK", "B", "C", "D"] },
        { id: "q4", question: "TCP window size?", topic: "TCP Protocol", correctAnswer: 0, options: ["Flow", "B", "C", "D"] }
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

    const perf5 = await AdaptiveLearningService.getTopicPerformance(userAId, book1.id);
    const tcpPerf = perf5.find((t) => t.topic === "TCP Protocol");
    assert.strictEqual(tcpPerf.attempts, 2, "Attempts count must be 2");
    assert.strictEqual(tcpPerf.totalQuestions, 4, "Total questions across attempts must be 4");
    assert.strictEqual(tcpPerf.correctCount, 3, "Total correct questions must be 3");
    assert.strictEqual(tcpPerf.accuracy, 75, "Overall accuracy should be (3/4)*100 = 75%");
    console.log("  PASSED: Multiple quiz attempts accurately aggregated chronologically.\n");

    // -------------------------------------------------------------
    // TEST 6: Improvement Trend (40% -> 55% -> 70%)
    // -------------------------------------------------------------
    console.log("TEST 6: Improvement trend (40% -> 55% -> 70%)");
    const scoresImprove = [40, 55, 70];
    for (let i = 0; i < scoresImprove.length; i++) {
      const q = await Quiz.create({
        id: `qz_p7v_imp_${i}_${Date.now()}`,
        book_id: book1.id,
        user_id: userAId,
        num_questions: 10,
        questions: [{ id: `qi_${i}`, topic: "Routing Protocols" }]
      });
      const correct = Math.round(scoresImprove[i] / 10);
      await Quiz.recordSubmission({
        id: q.id,
        score: correct,
        total_questions: 10,
        percentage: scoresImprove[i],
        performance_level: "Evaluating",
        answers: Array.from({ length: 10 }, (_, idx) => ({
          questionId: `qi_${i}_${idx}`,
          isCorrect: idx < correct,
          topic: "Routing Protocols"
        }))
      });
    }

    const perf6 = await AdaptiveLearningService.getTopicPerformance(userAId, book1.id);
    const routingPerf = perf6.find((t) => t.topic === "Routing Protocols");
    assert.strictEqual(routingPerf.trend, "improving", "40 -> 55 -> 70 must be classified as 'improving'");
    assert.strictEqual(routingPerf.learningState, "improving", "Learning state must reflect improvement");
    console.log("  PASSED: Improvement trend correctly identified.\n");

    // -------------------------------------------------------------
    // TEST 7: Decline Trend (85% -> 70% -> 50%)
    // -------------------------------------------------------------
    console.log("TEST 7: Decline trend (85% -> 70% -> 50%)");
    const scoresDecline = [85, 70, 50];
    for (let i = 0; i < scoresDecline.length; i++) {
      const q = await Quiz.create({
        id: `qz_p7v_dec_${i}_${Date.now()}`,
        book_id: book1.id,
        user_id: userAId,
        num_questions: 10,
        questions: [{ id: `qd_${i}`, topic: "Wireless Networks" }]
      });
      const correct = Math.round(scoresDecline[i] / 10);
      await Quiz.recordSubmission({
        id: q.id,
        score: correct,
        total_questions: 10,
        percentage: scoresDecline[i],
        performance_level: "Evaluating",
        answers: Array.from({ length: 10 }, (_, idx) => ({
          questionId: `qd_${i}_${idx}`,
          isCorrect: idx < correct,
          topic: "Wireless Networks"
        }))
      });
    }

    const perf7 = await AdaptiveLearningService.getTopicPerformance(userAId, book1.id);
    const wirelessPerf = perf7.find((t) => t.topic === "Wireless Networks");
    assert.strictEqual(wirelessPerf.trend, "declining", "85 -> 70 -> 50 must be classified as 'declining'");
    assert.strictEqual(wirelessPerf.learningState, "declining", "Learning state must reflect declining performance");
    console.log("  PASSED: Decline trend correctly identified.\n");

    // -------------------------------------------------------------
    // TEST 8: Stable Trend (70% -> 72% -> 71%)
    // -------------------------------------------------------------
    console.log("TEST 8: Stable trend (70% -> 72% -> 71%)");
    const scoresStable = [70, 72, 71];
    for (let i = 0; i < scoresStable.length; i++) {
      const q = await Quiz.create({
        id: `qz_p7v_stb_${i}_${Date.now()}`,
        book_id: book1.id,
        user_id: userAId,
        num_questions: 100,
        questions: [{ id: `qs_${i}`, topic: "Network Security" }]
      });
      await Quiz.recordSubmission({
        id: q.id,
        score: scoresStable[i],
        total_questions: 100,
        percentage: scoresStable[i],
        performance_level: "Evaluating",
        answers: Array.from({ length: 100 }, (_, idx) => ({
          questionId: `qs_${i}_${idx}`,
          isCorrect: idx < scoresStable[i],
          topic: "Network Security"
        }))
      });
    }

    const perf8 = await AdaptiveLearningService.getTopicPerformance(userAId, book1.id);
    const secPerf = perf8.find((t) => t.topic === "Network Security");
    assert.strictEqual(secPerf.trend, "stable", "70 -> 72 -> 71 must be classified as 'stable'");
    console.log("  PASSED: Stable trend correctly identified.\n");

    // -------------------------------------------------------------
    // TEST 9: Mixed Trend (40% -> 80% -> 45% -> 75%)
    // -------------------------------------------------------------
    console.log("TEST 9: Mixed trend (40% -> 80% -> 45% -> 75%)");
    const scoresMixed = [40, 80, 45, 75];
    for (let i = 0; i < scoresMixed.length; i++) {
      const q = await Quiz.create({
        id: `qz_p7v_mix_${i}_${Date.now()}`,
        book_id: book1.id,
        user_id: userAId,
        num_questions: 20,
        questions: [{ id: `qm_${i}`, topic: "DNS Resolution" }]
      });
      const correct = Math.round((scoresMixed[i] / 100) * 20);
      await Quiz.recordSubmission({
        id: q.id,
        score: correct,
        total_questions: 20,
        percentage: scoresMixed[i],
        performance_level: "Evaluating",
        answers: Array.from({ length: 20 }, (_, idx) => ({
          questionId: `qm_${i}_${idx}`,
          isCorrect: idx < correct,
          topic: "DNS Resolution"
        }))
      });
    }

    const perf9 = await AdaptiveLearningService.getTopicPerformance(userAId, book1.id);
    const dnsPerf = perf9.find((t) => t.topic === "DNS Resolution");
    assert.strictEqual(dnsPerf.trend, "mixed", "40 -> 80 -> 45 -> 75 with alternating swings must be 'mixed'");
    console.log("  PASSED: Mixed / fluctuating trend correctly detected.\n");

    // -------------------------------------------------------------
    // TEST 10: Topic-Level Performance Calculation
    // -------------------------------------------------------------
    console.log("TEST 10: Topic-level performance calculation");
    const quizMulti = await Quiz.create({
      id: `qz_p7v_multi_${Date.now()}`,
      book_id: book1.id,
      user_id: userAId,
      num_questions: 4,
      questions: [
        { id: "qm1", topic: "Subnet Masks" },
        { id: "qm2", topic: "Subnet Masks" },
        { id: "qm3", topic: "CIDR" },
        { id: "qm4", topic: "CIDR" }
      ]
    });
    await Quiz.recordSubmission({
      id: quizMulti.id,
      score: 2,
      total_questions: 4,
      percentage: 50,
      performance_level: "Evaluating",
      answers: [
        { questionId: "qm1", isCorrect: false, topic: "Subnet Masks" },
        { questionId: "qm2", isCorrect: true, topic: "Subnet Masks" },
        { questionId: "qm3", isCorrect: true, topic: "CIDR" },
        { questionId: "qm4", isCorrect: true, topic: "CIDR" }
      ]
    });

    const perf10 = await AdaptiveLearningService.getTopicPerformance(userAId, book1.id);
    const subnetPerf = perf10.find((t) => t.topic === "Subnet Masks");
    const cidrPerf = perf10.find((t) => t.topic === "CIDR");
    assert.ok(subnetPerf, "Subnet Masks topic must exist");
    assert.ok(cidrPerf, "CIDR topic must exist");
    assert.strictEqual(subnetPerf.accuracy, 50, "Subnet Masks accuracy should be 50%");
    assert.strictEqual(cidrPerf.accuracy, 100, "CIDR accuracy should be 100%");
    console.log("  PASSED: Independent topic-level metrics calculated accurately.\n");

    // -------------------------------------------------------------
    // TEST 11: Weak-Topic Identification
    // -------------------------------------------------------------
    console.log("TEST 11: Weak-topic identification");
    const weakTopics = await AdaptiveLearningService.detectWeakTopics(userAId, book1.id);
    assert.ok(weakTopics.some((t) => t.topic === "Subnet Masks"), "Subnet Masks (50%) must be detected as weak");
    assert.ok(weakTopics.some((t) => t.topic === "Wireless Networks"), "Declining Wireless Networks must be detected as weak");
    assert.ok(!weakTopics.some((t) => t.topic === "CIDR"), "Strong CIDR must NOT be detected as weak");
    console.log("  PASSED: Weak topics accurately identified based on accuracy and state.\n");

    // -------------------------------------------------------------
    // TEST 12: Strong-Topic Identification
    // -------------------------------------------------------------
    console.log("TEST 12: Strong-topic identification");
    const strongTopics = await AdaptiveLearningService.detectStrongTopics(userAId, book1.id);
    assert.ok(strongTopics.some((t) => t.topic === "CIDR"), "CIDR (100%) must be detected as strong");
    assert.ok(!strongTopics.some((t) => t.topic === "Subnet Masks"), "Weak Subnet Masks must NOT be detected as strong");
    console.log("  PASSED: Strong topics accurately identified.\n");

    // -------------------------------------------------------------
    // TEST 13: Learning-State Classification
    // -------------------------------------------------------------
    console.log("TEST 13: Learning-state classification");
    assert.strictEqual(subnetPerf.learningState, "needs_revision", "Subnet Masks (<60%) must be 'needs_revision'");
    assert.strictEqual(wirelessPerf.learningState, "declining", "Wireless Networks must be 'declining'");
    assert.strictEqual(routingPerf.learningState, "improving", "Routing Protocols must be 'improving'");
    assert.strictEqual(cidrPerf.learningState, "strong", "Single high attempt on CIDR must be 'strong'");
    console.log("  PASSED: Learning state classification follows deterministic rules.\n");

    // -------------------------------------------------------------
    // TEST 14: Personalized Recommendation Generation
    // -------------------------------------------------------------
    console.log("TEST 14: Personalized recommendation generation");
    const recs14 = await AdaptiveLearningService.generatePersonalizedRecommendations(userAId, book1.id);
    assert.ok(recs14.length > 0, "Personalized recommendations must be generated");

    const weakRec = recs14.find((r) => r.topic === "Subnet Masks");
    assert.ok(weakRec, "Recommendation for weak topic 'Subnet Masks' must exist");
    assert.strictEqual(weakRec.type, "REVISION");
    assert.strictEqual(weakRec.urgency, "High");
    assert.ok(weakRec.reason.includes("50%"), "Dynamic reason must include actual student score (50%)");

    const decRec = recs14.find((r) => r.badge === "Declining Trend");
    assert.ok(decRec, "Recommendation for declining trend must exist");
    assert.strictEqual(decRec.urgency, "High");

    const impRec = recs14.find((r) => r.badge === "Improving Trend");
    assert.ok(impRec, "Recommendation for improving topic must exist");
    assert.strictEqual(impRec.type, "PRACTICE");
    console.log("  PASSED: Recommendations dynamically derived from user's actual history.\n");

    // -------------------------------------------------------------
    // TEST 15: Insufficient-Data Handling
    // -------------------------------------------------------------
    console.log("TEST 15: Insufficient-data handling");
    const recsB = await AdaptiveLearningService.generatePersonalizedRecommendations(userBId);
    assert.strictEqual(recsB.length, 0, "User B with zero quizzes must receive empty recommendations");
    const diffB = await AdaptiveLearningService.getRecommendedDifficulty(userBId);
    assert.strictEqual(diffB, "Intermediate", "User with insufficient history defaults to Intermediate difficulty");
    console.log("  PASSED: Insufficient history safely yields empty recommendations without crashing.\n");

    // -------------------------------------------------------------
    // TEST 16: Book Isolation
    // -------------------------------------------------------------
    console.log("TEST 16: Book isolation");
    // Add quiz for Book 2 (Cell Biology) with 40% score
    const quizBio = await Quiz.create({
      id: `qz_p7v_bio_${Date.now()}`,
      book_id: book2.id,
      user_id: userAId,
      num_questions: 2,
      questions: [{ id: "qbio1", topic: "Cellular Respiration" }, { id: "qbio2", topic: "Cellular Respiration" }]
    });
    await Quiz.recordSubmission({
      id: quizBio.id,
      score: 0,
      total_questions: 2,
      percentage: 0,
      performance_level: "Weak",
      answers: [
        { questionId: "qbio1", isCorrect: false, topic: "Cellular Respiration" },
        { questionId: "qbio2", isCorrect: false, topic: "Cellular Respiration" }
      ]
    });

    // Book 1 query should NOT contain Cellular Respiration
    const recsBook1 = await AdaptiveLearningService.generatePersonalizedRecommendations(userAId, book1.id);
    assert.ok(!recsBook1.some((r) => r.topic.includes("Cellular Respiration")), "Book 1 recommendations must NOT contain Biology topics");

    // Book 2 query should ONLY contain Cellular Respiration
    const recsBook2 = await AdaptiveLearningService.generatePersonalizedRecommendations(userAId, book2.id);
    assert.ok(recsBook2.some((r) => r.topic.includes("Cellular Respiration")), "Book 2 recommendations must contain Cellular Respiration");
    assert.ok(!recsBook2.some((r) => r.topic.includes("Subnet Masks")), "Book 2 recommendations must NOT contain Network topics");
    console.log("  PASSED: Performance and recommendations strictly isolated between textbooks.\n");

    // -------------------------------------------------------------
    // TEST 17: Cross-User Isolation
    // -------------------------------------------------------------
    console.log("TEST 17: Cross-user isolation");
    // User B tries to access User A's recommendations via /api/recommendations/:user_id
    const resCross1 = await fetch(`${BASE_URL}/recommendations/${userAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(resCross1.status, 403, "User B accessing User A recommendations must return 403 Forbidden");

    // User B tries to access User A's book adaptive learning
    const resCross2 = await fetch(`${BASE_URL}/adaptive-learning/${book1.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(resCross2.status, 403, "User B accessing User A textbook adaptive learning must return 403 Forbidden");

    // User B adaptive dashboard has 0 topics from User A
    const resUserB = await fetch(`${BASE_URL}/adaptive-learning`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const dataUserB = await resUserB.json();
    assert.strictEqual(dataUserB.topicPerformance.length, 0, "User B must have 0 topics from User A");
    console.log("  PASSED: Cross-user access securely blocked with 403 Forbidden; zero data leakage.\n");

    // -------------------------------------------------------------
    // TEST 18: Invalid Input Handling
    // -------------------------------------------------------------
    console.log("TEST 18: Invalid input handling");
    const resInvalidBook = await fetch(`${BASE_URL}/adaptive-learning/non-existent-book-uuid`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(resInvalidBook.status, 404, "Non-existent book ID must return 404 Not Found");

    const resInvalidRec = await fetch(`${BASE_URL}/recommendations/${userAId}?bookId=non-existent-book-uuid`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(resInvalidRec.status, 404, "Recommendations with non-existent book must return 404 Not Found");
    console.log("  PASSED: Invalid book identifiers handled gracefully with 404 Not Found.\n");

    // -------------------------------------------------------------
    // TEST 19: Backend Error Handling & Response Transparency
    // -------------------------------------------------------------
    console.log("TEST 19: Backend error handling & response transparency");
    const resErr = await fetch(`${BASE_URL}/recommendations/non-existent-user-uuid`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const dataErr = await resErr.json();
    assert.strictEqual(resErr.status, 403, "Requesting non-matching user ID returns 403");
    assert.strictEqual(dataErr.success, false);
    assert.ok(dataErr.error, "Error response must include descriptive message");
    console.log("  PASSED: Error responses follow standard transparent schema { success: false, error: ... }.\n");

    // -------------------------------------------------------------
    // TEST 20: No Static / Fake Recommendation Fallback
    // -------------------------------------------------------------
    console.log("TEST 20: No static / fake recommendation fallback");
    // Create new fresh student C
    const studentCEmail = `p7v.studentC.${Date.now()}@university.edu`;
    const signupC = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Phase 7 Student C", email: studentCEmail, password: "password123" })
    });
    const signupCData = await signupC.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentCEmail, otp: signupCData.devOtp })
    });
    const loginC = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: studentCEmail, password: "password123" })
    });
    const tokenC = (await loginC.json()).token;

    const resRecsC = await fetch(`${BASE_URL}/recommendations`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    const dataRecsC = await resRecsC.json();
    assert.strictEqual(resRecsC.status, 200);
    assert.strictEqual(dataRecsC.recommendations.length, 0, "Must NOT return fake or static starter recommendations");
    assert.strictEqual(dataRecsC.insufficientHistory, true, "Must flag insufficientHistory instead of inventing data");
    console.log("  PASSED: Zero fake/static fallbacks returned for fresh users.\n");

    console.log("🎉 ALL 20 PHASE 7 ADAPTIVE PERSONALIZED LEARNING VERIFICATION TESTS PASSED!\n");
  } finally {
    if (server) {
      server.close();
      console.log(" Test server closed.");
    }
  }
};

runVerificationTests().catch((err) => {
  console.error("❌ Test verification failure:", err);
  if (server) server.close();
  process.exit(1);
});
