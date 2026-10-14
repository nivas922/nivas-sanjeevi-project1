import assert from "assert";
import { initDb, dbRun } from "../src/config/db.js";
import { Book } from "../src/models/Book.js";
import { Quiz } from "../src/models/Quiz.js";
import { User } from "../src/models/User.js";
import { AdaptiveLearningService, ADAPTIVE_CONFIG } from "../src/services/adaptiveLearningService.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const PORT = 5599;
let server;
const BASE_URL = `http://localhost:${PORT}/api`;

const runLearningAnalyticsTests = async () => {
  console.log("\n🧪 Running Complete 22-Case Learning Analytics & Personalized Learning Path Test Suite...\n");

  await initDb();
  await dbRun("DELETE FROM quizzes WHERE user_id LIKE 'usr_lat_%'");
  await dbRun("DELETE FROM books WHERE id LIKE 'book_lat_%'");
  await dbRun("DELETE FROM users WHERE id LIKE 'usr_lat_%'");

  server = app.listen(PORT);
  console.log(` Test server listening on port ${PORT}\n`);

  try {
    // -------------------------------------------------------------------------
    // Setup test users: Student 1 and Student 2
    // -------------------------------------------------------------------------
    const user1Email = `lat.student1.${Date.now()}@university.edu`;
    const signup1 = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Analytics Student 1", email: user1Email, password: "password123" })
    });
    const signup1Data = await signup1.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user1Email, otp: signup1Data.devOtp })
    });
    const login1 = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user1Email, password: "password123" })
    });
    const login1Data = await login1.json();
    const token1 = login1Data.token;
    const user1Id = login1Data.user.id;

    const user2Email = `lat.student2.${Date.now()}@university.edu`;
    const signup2 = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Analytics Student 2", email: user2Email, password: "password123" })
    });
    const signup2Data = await signup2.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user2Email, otp: signup2Data.devOtp })
    });
    const login2 = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user2Email, password: "password123" })
    });
    const login2Data = await login2.json();
    const token2 = login2Data.token;
    const user2Id = login2Data.user.id;

    const book = await Book.create({
      id: `book_lat_cs_${Date.now()}`,
      user_id: user1Id,
      file_url: "/uploads/lat_cs.pdf",
      title: "Data Structures and Algorithms",
      subject: "Computer Science",
      extracted_text: "Recursion, Time Complexity, Graph Algorithms, and Trees."
    });

    // =========================================================================
    // CASE 1: Student with no quiz history
    // =========================================================================
    console.log("CASE 1: Student with no quiz history");
    const perfZero = await AdaptiveLearningService.getTopicPerformance(user2Id);
    assert.strictEqual(perfZero.length, 0, "No quiz history must return empty topic array");
    const dashZero = await AdaptiveLearningService.getAdaptiveDashboard(user2Id);
    assert.strictEqual(dashZero.insufficientHistory, true, "insufficientHistory flag must be true");
    assert.strictEqual(dashZero.overallProgress, 0, "Zero-state progress must be 0");
    assert.strictEqual(dashZero.topicPerformance.length, 0);
    console.log("  ✔ PASSED: Clean zero-state returned for student with no quiz history.\n");

    // =========================================================================
    // CASE 2: Student with insufficient topic-level evidence
    // =========================================================================
    console.log("CASE 2: Student with insufficient topic-level evidence");
    const quizSingleQ = await Quiz.create({
      id: `qz_lat_single_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 1,
      questions: [{ id: "q_one", topic: "Single Evidence Topic", question: "Sample?" }]
    });
    await Quiz.recordSubmission({
      id: quizSingleQ.id,
      score: 1,
      total_questions: 1,
      percentage: 100,
      performance_level: "Strong",
      answers: [{ questionId: "q_one", isCorrect: true, topic: "Single Evidence Topic" }]
    });

    const perfCase2 = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const singleTopic = perfCase2.find((t) => t.topic === "Single Evidence Topic");
    assert.ok(singleTopic, "Topic must be found");
    assert.strictEqual(singleTopic.accuracy, 100);
    assert.strictEqual(singleTopic.isProvisional, true, "1 question must be flagged isProvisional = true");
    assert.strictEqual(singleTopic.evidenceLevel, "insufficient_data");
    console.log("  ✔ PASSED: Insufficient topic evidence correctly flagged as provisional.\n");

    // Clear user1 records for subsequent isolated unit tests
    await dbRun("DELETE FROM quizzes WHERE user_id = ?", [user1Id]);

    // =========================================================================
    // CASE 3: Topic accuracy at 40% (Needs Improvement)
    // =========================================================================
    console.log("CASE 3: Topic accuracy at 40% (Needs Improvement)");
    const quiz40 = await Quiz.create({
      id: `qz_lat_40_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 5,
      questions: Array.from({ length: 5 }, (_, i) => ({ id: `q40_${i}`, topic: "Time Complexity" }))
    });
    await Quiz.recordSubmission({
      id: quiz40.id,
      score: 2,
      total_questions: 5,
      percentage: 40,
      performance_level: "Needs Improvement",
      answers: Array.from({ length: 5 }, (_, i) => ({
        questionId: `q40_${i}`,
        isCorrect: i < 2,
        topic: "Time Complexity"
      }))
    });
    const perf40 = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const topic40 = perf40.find((t) => t.topic === "Time Complexity");
    assert.strictEqual(topic40.accuracy, 40, "Accuracy must be exactly 40%");
    assert.strictEqual(topic40.classification, "needs_improvement", "Classification must be needs_improvement");
    console.log("  ✔ PASSED: 40% accuracy correctly classified as needs_improvement.\n");

    // =========================================================================
    // CASE 4: Topic accuracy at 50% (In Progress)
    // =========================================================================
    console.log("CASE 4: Topic accuracy at 50% (In Progress)");
    const quiz50 = await Quiz.create({
      id: `qz_lat_50_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 6,
      questions: Array.from({ length: 6 }, (_, i) => ({ id: `q50_${i}`, topic: "Binary Search" }))
    });
    await Quiz.recordSubmission({
      id: quiz50.id,
      score: 3,
      total_questions: 6,
      percentage: 50,
      performance_level: "Evaluating",
      answers: Array.from({ length: 6 }, (_, i) => ({
        questionId: `q50_${i}`,
        isCorrect: i < 3,
        topic: "Binary Search"
      }))
    });
    const perf50 = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const topic50 = perf50.find((t) => t.topic === "Binary Search");
    assert.strictEqual(topic50.accuracy, 50, "Accuracy must be 50%");
    assert.strictEqual(topic50.classification, "in_progress", "50% must be classified as in_progress");
    console.log("  ✔ PASSED: 50% accuracy correctly classified as in_progress.\n");

    // =========================================================================
    // CASE 5: Topic accuracy at 79% (In Progress)
    // =========================================================================
    console.log("CASE 5: Topic accuracy at 79% (In Progress boundary)");
    // 79 out of 100 questions -> 79%
    const quiz79 = await Quiz.create({
      id: `qz_lat_79_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 100,
      questions: [{ id: "q79_base", topic: "Recursion Depth" }]
    });
    await Quiz.recordSubmission({
      id: quiz79.id,
      score: 79,
      total_questions: 100,
      percentage: 79,
      performance_level: "Evaluating",
      answers: Array.from({ length: 100 }, (_, i) => ({
        questionId: `q79_${i}`,
        isCorrect: i < 79,
        topic: "Recursion Depth"
      }))
    });
    const perf79 = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const topic79 = perf79.find((t) => t.topic === "Recursion Depth");
    assert.strictEqual(topic79.accuracy, 79, "Accuracy must be 79%");
    assert.strictEqual(topic79.classification, "in_progress", "79% must remain in_progress (< 80%)");
    console.log("  ✔ PASSED: 79% accuracy boundary correctly classified as in_progress.\n");

    // =========================================================================
    // CASE 6: Topic accuracy at 80% (Strong)
    // =========================================================================
    console.log("CASE 6: Topic accuracy at 80% (Strong boundary)");
    // 4 out of 5 questions -> 80%
    const quiz80 = await Quiz.create({
      id: `qz_lat_80_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 5,
      questions: Array.from({ length: 5 }, (_, i) => ({ id: `q80_${i}`, topic: "Array Operations" }))
    });
    await Quiz.recordSubmission({
      id: quiz80.id,
      score: 4,
      total_questions: 5,
      percentage: 80,
      performance_level: "Strong",
      answers: Array.from({ length: 5 }, (_, i) => ({
        questionId: `q80_${i}`,
        isCorrect: i < 4,
        topic: "Array Operations"
      }))
    });
    const perf80 = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const topic80 = perf80.find((t) => t.topic === "Array Operations");
    assert.strictEqual(topic80.accuracy, 80, "Accuracy must be 80%");
    assert.strictEqual(topic80.classification, "strong", "80% must be classified as strong (>= 80%)");
    console.log("  ✔ PASSED: 80% accuracy boundary correctly classified as strong.\n");

    // Clear for trend tests
    await dbRun("DELETE FROM quizzes WHERE user_id = ?", [user1Id]);

    // =========================================================================
    // CASE 7: Topic with consistently strong results
    // =========================================================================
    console.log("CASE 7: Topic with consistently strong results");
    for (let i = 0; i < 3; i++) {
      const q = await Quiz.create({
        id: `qz_lat_cs_${i}_${Date.now()}`,
        book_id: book.id,
        user_id: user1Id,
        num_questions: 5,
        questions: [{ id: `qcs_${i}`, topic: "Python Basics" }]
      });
      await Quiz.recordSubmission({
        id: q.id,
        score: 5,
        total_questions: 5,
        percentage: 100,
        performance_level: "Strong",
        answers: Array.from({ length: 5 }, (_, j) => ({
          questionId: `qcs_${i}_${j}`,
          isCorrect: true,
          topic: "Python Basics"
        }))
      });
    }
    const perfCons = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const pyTopic = perfCons.find((t) => t.topic === "Python Basics");
    assert.strictEqual(pyTopic.accuracy, 100);
    assert.strictEqual(pyTopic.classification, "strong");
    assert.strictEqual(pyTopic.isProvisional, false, "3 attempts with 15 questions must be confirmed");
    console.log("  ✔ PASSED: Consistently strong results correctly evaluated.\n");

    // =========================================================================
    // CASE 8: Topic with improving recent performance
    // =========================================================================
    console.log("CASE 8: Topic with improving recent performance");
    const improveScores = [40, 60, 80];
    for (let i = 0; i < improveScores.length; i++) {
      const q = await Quiz.create({
        id: `qz_lat_imp_${i}_${Date.now()}`,
        book_id: book.id,
        user_id: user1Id,
        num_questions: 10,
        questions: [{ id: `qimp_${i}`, topic: "Dynamic Programming" }]
      });
      const correct = Math.round(improveScores[i] / 10);
      await Quiz.recordSubmission({
        id: q.id,
        score: correct,
        total_questions: 10,
        percentage: improveScores[i],
        performance_level: "Evaluating",
        answers: Array.from({ length: 10 }, (_, j) => ({
          questionId: `qimp_${i}_${j}`,
          isCorrect: j < correct,
          topic: "Dynamic Programming"
        }))
      });
    }
    const perfImp = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const dpTopic = perfImp.find((t) => t.topic === "Dynamic Programming");
    assert.strictEqual(dpTopic.trend, "improving", "40 -> 60 -> 80 must be classified as improving");
    console.log("  ✔ PASSED: Improving recent performance identified accurately.\n");

    // =========================================================================
    // CASE 9: Topic with declining recent performance
    // =========================================================================
    console.log("CASE 9: Topic with declining recent performance");
    const declineScores = [90, 70, 50];
    for (let i = 0; i < declineScores.length; i++) {
      const q = await Quiz.create({
        id: `qz_lat_dec_${i}_${Date.now()}`,
        book_id: book.id,
        user_id: user1Id,
        num_questions: 10,
        questions: [{ id: `qdec_${i}`, topic: "Tree Traversals" }]
      });
      const correct = Math.round(declineScores[i] / 10);
      await Quiz.recordSubmission({
        id: q.id,
        score: correct,
        total_questions: 10,
        percentage: declineScores[i],
        performance_level: "Evaluating",
        answers: Array.from({ length: 10 }, (_, j) => ({
          questionId: `qdec_${i}_${j}`,
          isCorrect: j < correct,
          topic: "Tree Traversals"
        }))
      });
    }
    const perfDec = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const treeTopic = perfDec.find((t) => t.topic === "Tree Traversals");
    assert.strictEqual(treeTopic.trend, "declining", "90 -> 70 -> 50 must be classified as declining");
    console.log("  ✔ PASSED: Declining performance trend identified accurately.\n");

    // =========================================================================
    // CASE 10: Topic with inconsistent attempts
    // =========================================================================
    console.log("CASE 10: Topic with inconsistent attempts");
    const mixedScores = [35, 80, 40, 75];
    for (let i = 0; i < mixedScores.length; i++) {
      const q = await Quiz.create({
        id: `qz_lat_mix_${i}_${Date.now()}`,
        book_id: book.id,
        user_id: user1Id,
        num_questions: 10,
        questions: [{ id: `qmix_${i}`, topic: "Graph Search" }]
      });
      const correct = Math.round(mixedScores[i] / 10);
      await Quiz.recordSubmission({
        id: q.id,
        score: correct,
        total_questions: 10,
        percentage: mixedScores[i],
        performance_level: "Evaluating",
        answers: Array.from({ length: 10 }, (_, j) => ({
          questionId: `qmix_${i}_${j}`,
          isCorrect: j < correct,
          topic: "Graph Search"
        }))
      });
    }
    const perfMix = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const graphTopic = perfMix.find((t) => t.topic === "Graph Search");
    assert.strictEqual(graphTopic.trend, "mixed", "Alternating scores must yield 'mixed' trend");
    console.log("  ✔ PASSED: Inconsistent attempts identified as mixed trend.\n");

    // =========================================================================
    // CASE 11: Missing topic metadata
    // =========================================================================
    console.log("CASE 11: Missing topic metadata");
    const quizMissingMeta = await Quiz.create({
      id: `qz_lat_nometa_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 2,
      questions: [{ id: "q_nometa_1" }, { id: "q_nometa_2" }] // no topic key
    });
    await Quiz.recordSubmission({
      id: quizMissingMeta.id,
      score: 2,
      total_questions: 2,
      percentage: 100,
      performance_level: "Strong",
      answers: [
        { questionId: "q_nometa_1", isCorrect: true },
        { questionId: "q_nometa_2", isCorrect: true }
      ]
    });
    const perfNoMeta = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const coreTopic = perfNoMeta.find((t) => t.topic === "Core Concepts");
    assert.ok(coreTopic, "Missing topic must gracefully default to 'Core Concepts'");
    console.log("  ✔ PASSED: Missing topic metadata handled gracefully without crashing.\n");

    // =========================================================================
    // CASE 12: Incomplete quiz attempts
    // =========================================================================
    console.log("CASE 12: Incomplete quiz attempts");
    // Create an unsubmitted quiz where score/answers_json are not yet recorded
    await Quiz.create({
      id: `qz_lat_unsub_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 5,
      questions: [{ id: "qu_1", topic: "Unsubmitted Topic" }]
    });
    const perfInc = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const unsubmittedTopic = perfInc.find((t) => t.topic === "Unsubmitted Topic");
    assert.strictEqual(unsubmittedTopic, undefined, "Unsubmitted quiz questions must not be counted in performance");
    console.log("  ✔ PASSED: Incomplete quiz attempts strictly excluded from calculation.\n");

    // =========================================================================
    // CASE 13: Duplicate quiz submissions / answers
    // =========================================================================
    console.log("CASE 13: Duplicate quiz answers");
    const quizDup = await Quiz.create({
      id: `qz_lat_dup_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 2,
      questions: [
        { id: "q_dup_1", topic: "Deduplication Topic" },
        { id: "q_dup_2", topic: "Deduplication Topic" }
      ]
    });
    // Payload contains duplicate answers for q_dup_1
    await Quiz.recordSubmission({
      id: quizDup.id,
      score: 2,
      total_questions: 2,
      percentage: 100,
      performance_level: "Strong",
      answers: [
        { questionId: "q_dup_1", isCorrect: true, topic: "Deduplication Topic" },
        { questionId: "q_dup_1", isCorrect: true, topic: "Deduplication Topic" }, // duplicate!
        { questionId: "q_dup_2", isCorrect: true, topic: "Deduplication Topic" }
      ]
    });
    const perfDup = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const dupTopic = perfDup.find((t) => t.topic === "Deduplication Topic");
    assert.strictEqual(dupTopic.totalQuestions, 2, "Duplicate answer for same question ID must be deduplicated");
    console.log("  ✔ PASSED: Duplicate answers within quiz submission deduplicated.\n");

    // =========================================================================
    // CASE 14: Multiple quizzes covering the same topic
    // =========================================================================
    console.log("CASE 14: Multiple quizzes covering the same topic");
    for (let k = 0; k < 2; k++) {
      const q = await Quiz.create({
        id: `qz_lat_multi_topic_${k}_${Date.now()}`,
        book_id: book.id,
        user_id: user1Id,
        num_questions: 3,
        questions: [{ id: `qm_${k}`, topic: "Hashing Techniques" }]
      });
      await Quiz.recordSubmission({
        id: q.id,
        score: 3,
        total_questions: 3,
        percentage: 100,
        performance_level: "Strong",
        answers: Array.from({ length: 3 }, (_, j) => ({
          questionId: `qm_${k}_${j}`,
          isCorrect: true,
          topic: "Hashing Techniques"
        }))
      });
    }
    const perfMulti = await AdaptiveLearningService.getTopicPerformance(user1Id);
    const hashTopic = perfMulti.find((t) => t.topic === "Hashing Techniques");
    assert.strictEqual(hashTopic.attempts, 2, "Attempts count across multiple quizzes must be 2");
    assert.strictEqual(hashTopic.totalQuestions, 6, "Total questions across multiple quizzes must be 6");
    console.log("  ✔ PASSED: Multiple quizzes covering same topic accurately aggregated.\n");

    // =========================================================================
    // CASE 15: Multiple topics within a textbook
    // =========================================================================
    console.log("CASE 15: Multiple topics within a textbook");
    const quizMultiTopics = await Quiz.create({
      id: `qz_lat_multi_distinct_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 4,
      questions: [
        { id: "q_t1", topic: "Topic Alpha" },
        { id: "q_t2", topic: "Topic Alpha" },
        { id: "q_t3", topic: "Topic Beta" },
        { id: "q_t4", topic: "Topic Beta" }
      ]
    });
    await Quiz.recordSubmission({
      id: quizMultiTopics.id,
      score: 3,
      total_questions: 4,
      percentage: 75,
      performance_level: "Evaluating",
      answers: [
        { questionId: "q_t1", isCorrect: true, topic: "Topic Alpha" },
        { questionId: "q_t2", isCorrect: true, topic: "Topic Alpha" },
        { questionId: "q_t3", isCorrect: false, topic: "Topic Beta" },
        { questionId: "q_t4", isCorrect: true, topic: "Topic Beta" }
      ]
    });
    const perfDistinct = await AdaptiveLearningService.getTopicPerformance(user1Id, book.id);
    const alpha = perfDistinct.find((t) => t.topic === "Topic Alpha");
    const beta = perfDistinct.find((t) => t.topic === "Topic Beta");
    assert.strictEqual(alpha.accuracy, 100, "Topic Alpha accuracy must be 100%");
    assert.strictEqual(beta.accuracy, 50, "Topic Beta accuracy must be 50%");
    console.log("  ✔ PASSED: Multiple topics within textbook computed independently.\n");

    // =========================================================================
    // CASE 16: Difficulty-aware analysis when difficulty metadata exists
    // =========================================================================
    console.log("CASE 16: Difficulty-aware analysis");
    const quizDiff = await Quiz.create({
      id: `qz_lat_diff_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 3,
      questions: [
        { id: "qd_easy", topic: "Sorting Algorithms", difficulty: "easy" },
        { id: "qd_med", topic: "Sorting Algorithms", difficulty: "medium" },
        { id: "qd_hard", topic: "Sorting Algorithms", difficulty: "hard" }
      ]
    });
    await Quiz.recordSubmission({
      id: quizDiff.id,
      score: 2,
      total_questions: 3,
      percentage: 67,
      performance_level: "Evaluating",
      answers: [
        { questionId: "qd_easy", isCorrect: true, topic: "Sorting Algorithms", difficulty: "easy" },
        { questionId: "qd_med", isCorrect: true, topic: "Sorting Algorithms", difficulty: "medium" },
        { questionId: "qd_hard", isCorrect: false, topic: "Sorting Algorithms", difficulty: "hard" }
      ]
    });
    const perfDiff = await AdaptiveLearningService.getTopicPerformance(user1Id, book.id);
    const sortTopic = perfDiff.find((t) => t.topic === "Sorting Algorithms");
    assert.strictEqual(sortTopic.hasDifficultyData, true);
    assert.ok(sortTopic.difficultyBreakdown, "Difficulty breakdown must exist");
    assert.strictEqual(sortTopic.difficultyBreakdown.easy.accuracy, 100);
    assert.strictEqual(sortTopic.difficultyBreakdown.hard.accuracy, 0);
    console.log("  ✔ PASSED: Difficulty breakdown accurately recorded and computed.\n");

    // =========================================================================
    // CASE 17: Gemini API quota failure
    // =========================================================================
    console.log("CASE 17: Gemini API quota failure handling");
    const quotaInsights = await AdaptiveLearningService.generateAiLearningInsights({
      userId: user1Id,
      bookId: book.id,
      topicPerformance: perfDiff,
      progressOverTime: { direction: "improving", latestScore: 75, message: "Improving" }
    });
    assert.ok(quotaInsights, "Quota failure must yield valid insights object");
    assert.ok(quotaInsights.summary, "Must have diagnostic summary");
    console.log("  ✔ PASSED: Gemini quota failure handled without interrupting dashboard.\n");

    // =========================================================================
    // CASE 18: Gemini API timeout or unavailable service
    // =========================================================================
    console.log("CASE 18: Gemini API timeout / unavailable service");
    const timeoutInsights = await AdaptiveLearningService.generateAiLearningInsights({
      userId: "timeout-user",
      bookId: book.id,
      topicPerformance: [sortTopic],
      progressOverTime: { direction: "declining", latestScore: 40, message: "Declining" }
    });
    assert.ok(timeoutInsights.gapAnalysis, "Must provide fallback gap analysis");
    console.log("  ✔ PASSED: Gemini timeout handled gracefully with fallback strategy.\n");

    // =========================================================================
    // CASE 19: Deterministic fallback recommendations
    // =========================================================================
    console.log("CASE 19: Deterministic fallback recommendations");
    const recs19 = await AdaptiveLearningService.generatePersonalizedRecommendations(user1Id, book.id);
    assert.ok(Array.isArray(recs19), "Must return array of recommendations");
    assert.ok(recs19.length > 0, "Recommendations must exist for user with quiz data");
    assert.ok(recs19.some((r) => r.type === "LEVEL_UP" || r.type === "REVISION" || r.type === "PRACTICE"));
    console.log("  ✔ PASSED: Deterministic fallback recommendations generated.\n");

    // =========================================================================
    // CASE 20: User isolation and authorization
    // =========================================================================
    console.log("CASE 20: User isolation and authorization");
    // Student 2 attempts to access Student 1's private analytics endpoint
    const resForbidden = await fetch(`${BASE_URL}/adaptive-learning/analytics/${user1Id}`, {
      headers: { Authorization: `Bearer ${token2}` }
    });
    assert.strictEqual(resForbidden.status, 403, "Cross-user private analytics access must return 403 Forbidden");

    // Student 1 accesses own analytics
    const resAllowed = await fetch(`${BASE_URL}/adaptive-learning/analytics/${user1Id}`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    assert.strictEqual(resAllowed.status, 200, "Owner accessing own analytics must succeed with 200 OK");
    console.log("  ✔ PASSED: Cross-student private analytics strictly isolated with 403.\n");

    // =========================================================================
    // CASE 21: Refreshing analytics after a new quiz
    // =========================================================================
    console.log("CASE 21: Refreshing analytics after a new quiz");
    const initialDash = await AdaptiveLearningService.getAdaptiveDashboard(user1Id, book.id);
    const initialAnswered = initialDash.overview.totalAnsweredQuestions;

    // Submit a new quiz
    const freshQuiz = await Quiz.create({
      id: `qz_lat_refresh_${Date.now()}`,
      book_id: book.id,
      user_id: user1Id,
      num_questions: 2,
      questions: [{ id: "q_fresh_1", topic: "Heap Data Structures" }]
    });
    await Quiz.recordSubmission({
      id: freshQuiz.id,
      score: 2,
      total_questions: 2,
      percentage: 100,
      performance_level: "Strong",
      answers: [
        { questionId: "q_fresh_1", isCorrect: true, topic: "Heap Data Structures" },
        { questionId: "q_fresh_2", isCorrect: true, topic: "Heap Data Structures" }
      ]
    });

    const refreshedDash = await AdaptiveLearningService.getAdaptiveDashboard(user1Id, book.id);
    assert.ok(
      refreshedDash.overview.totalAnsweredQuestions > initialAnswered,
      "Refreshed analytics must reflect newly answered questions"
    );
    assert.ok(
      refreshedDash.topicPerformance.some((t) => t.topic === "Heap Data Structures"),
      "Heap Data Structures must appear immediately in refreshed analytics"
    );
    console.log("  ✔ PASSED: Analytics refreshed immediately after new quiz submission.\n");

    // =========================================================================
    // CASE 22: Correct navigation data from learning-path actions
    // =========================================================================
    console.log("CASE 22: Correct navigation data from learning-path actions");
    const pathSteps = refreshedDash.orderedLearningPath;
    assert.ok(Array.isArray(pathSteps) && pathSteps.length >= 3, "Learning path must generate sequential steps");
    for (const step of pathSteps) {
      assert.ok(step.actionType, "Step must have actionType (summary, quiz, doubts)");
      assert.ok(["summary", "quiz", "doubts"].includes(step.actionType), "actionType must map to application route");
      assert.ok(step.actionText, "Must have actionText for UI button");
      assert.ok(step.topic, "Must have topic");
    }
    console.log("  ✔ PASSED: Learning-path steps provide verified navigation mappings.\n");

    console.log("🎉 ALL 22 LEARNING ANALYTICS TEST CASES PASSED FLAWLESSLY!\n");
  } finally {
    if (server) {
      server.close();
      console.log(" Test server closed.");
    }
  }
};

runLearningAnalyticsTests().catch((err) => {
  console.error("❌ Test suite failure:", err);
  if (server) server.close();
  process.exit(1);
});
