import { Quiz } from "../models/Quiz.js";
import { Book } from "../models/Book.js";
import { Progress } from "../models/Progress.js";
import { DocumentChunk } from "../models/DocumentChunk.js";
import { AiSummaryService } from "./aiSummaryService.js";
import { env } from "../config/env.js";

export const ADAPTIVE_CONFIG = {
  // Configurable performance classification thresholds
  strongThreshold: 80, // Accuracy >= 80% is Strong
  inProgressThreshold: 50, // Accuracy >= 50% and < 80% is In Progress
  needsImprovementThreshold: 50, // Accuracy < 50% is Needs Improvement

  // Configurable evidence thresholds
  minEvidenceQuestions: 3, // Minimum questions answered to confirm mastery / classification
  minEvidenceAttempts: 2, // Minimum quiz attempts for confirmed trend/mastery

  // Trend analysis thresholds
  improvingTrendThreshold: 10,
  recentAttemptsWindow: 3,
  defaultDifficulty: "Intermediate",

  // Legacy configuration aliases for 100% backward compatibility
  weakAccuracyThreshold: 60,
  masteryAccuracyThreshold: 85,
  minimumAttemptsForMastery: 2,
  difficultyProgressionWindow: 2,
  difficultyReductionWindow: 1
};

// In-memory cache for Gemini AI recommendations to avoid redundant API calls
const aiInsightsCache = new Map();

export class AdaptiveLearningService {
  /**
   * 1. Calculate topic-level performance metrics for a user
   * Strictly uses actual quiz records and question-level topic metadata.
   */
  static async getTopicPerformance(userId, bookId = null) {
    let quizzes = await Quiz.findByUserId(userId || "usr_default");
    if ((!quizzes || quizzes.length === 0) && (!userId || userId === "usr_default")) {
      quizzes = await Quiz.findAll();
    }
    if (bookId) {
      quizzes = quizzes.filter((q) => q.book_id === bookId || q.bookId === bookId);
    }

    if (!quizzes || quizzes.length === 0) {
      return [];
    }

    // Process only completed quizzes with valid submissions to avoid counting incomplete/unanswered questions
    const completedQuizzes = quizzes.filter(
      (q) =>
        q.performanceLevel !== "Pending" &&
        Array.isArray(q.answers) &&
        q.answers.length > 0
    );

    if (completedQuizzes.length === 0) {
      return [];
    }

    // Map to group performance per topic
    const topicStatsMap = new Map();

    // Process quizzes chronologically (oldest to newest) to track progression
    const sortedQuizzes = [...completedQuizzes].sort(
      (a, b) => new Date(a.taken_at || a.takenAt || 0) - new Date(b.taken_at || b.takenAt || 0)
    );

    for (const quiz of sortedQuizzes) {
      const answers = quiz.answers || [];
      const questions = quiz.questions || [];

      // Map question topics, difficulty, and explanations from questions array
      const questionMetaMap = new Map();
      questions.forEach((q, idx) => {
        const qId = q.id || `q_${idx}`;
        questionMetaMap.set(qId, {
          topic: q.topic || q.chapter || "Core Concepts",
          difficulty: (q.difficulty || "medium").toLowerCase(),
          explanation: q.explanation || "",
          question: q.question || ""
        });
      });

      // Group correct vs total and track difficulties and mistakes for this quiz attempt
      const attemptTopicGroup = new Map();
      const seenQuestionsInAttempt = new Set();

      if (answers.length > 0) {
        answers.forEach((ans, idx) => {
          const qId = ans.questionId || ans.id || `q_ans_${idx}`;
          // Avoid duplicate answers from retries or duplicate payloads
          if (seenQuestionsInAttempt.has(qId)) return;
          seenQuestionsInAttempt.add(qId);

          const meta = questionMetaMap.get(qId) || {};
          const topicName = ans.topic || meta.topic || "Core Concepts";
          const diff = (ans.difficulty || meta.difficulty || "medium").toLowerCase();

          if (!attemptTopicGroup.has(topicName)) {
            attemptTopicGroup.set(topicName, {
              correct: 0,
              total: 0,
              difficultyCounts: {
                easy: { correct: 0, total: 0 },
                medium: { correct: 0, total: 0 },
                hard: { correct: 0, total: 0 }
              },
              mistakes: []
            });
          }

          const group = attemptTopicGroup.get(topicName);
          group.total += 1;

          // Normalize difficulty key
          const diffKey = diff.includes("easy") || diff.includes("begin")
            ? "easy"
            : diff.includes("hard") || diff.includes("adv")
            ? "hard"
            : "medium";

          if (group.difficultyCounts[diffKey]) {
            group.difficultyCounts[diffKey].total += 1;
          }

          if (ans.isCorrect === true || ans.isCorrect === 1) {
            group.correct += 1;
            if (group.difficultyCounts[diffKey]) {
              group.difficultyCounts[diffKey].correct += 1;
            }
          } else {
            // Record mistake for repeated mistake detection
            group.mistakes.push({
              question: ans.question || meta.question || "",
              userOption: ans.userOption || "",
              correctOption: ans.correctOption || "",
              explanation: ans.explanation || meta.explanation || "",
              difficulty: diffKey
            });
          }
        });
      } else {
        // Fallback for legacy quizzes with recorded score
        const topicName = questions[0]?.topic || "Core Concepts";
        attemptTopicGroup.set(topicName, {
          correct: quiz.score || 0,
          total: quiz.totalQuestions || questions.length || 1,
          difficultyCounts: {
            easy: { correct: 0, total: 0 },
            medium: { correct: quiz.score || 0, total: quiz.totalQuestions || 1 },
            hard: { correct: 0, total: 0 }
          },
          mistakes: []
        });
      }

      // Aggregate into overall topicStatsMap
      for (const [topicName, stats] of attemptTopicGroup.entries()) {
        if (!topicStatsMap.has(topicName)) {
          topicStatsMap.set(topicName, {
            topic: topicName,
            bookId: quiz.book_id || null,
            attempts: 0,
            totalQuestions: 0,
            correctCount: 0,
            scores: [],
            difficultyCounts: {
              easy: { correct: 0, total: 0 },
              medium: { correct: 0, total: 0 },
              hard: { correct: 0, total: 0 }
            },
            mistakes: []
          });
        }

        const topicObj = topicStatsMap.get(topicName);
        topicObj.attempts += 1;
        topicObj.totalQuestions += stats.total;
        topicObj.correctCount += stats.correct;

        // Difficulty counts aggregate
        for (const [k, v] of Object.entries(stats.difficultyCounts)) {
          if (topicObj.difficultyCounts[k]) {
            topicObj.difficultyCounts[k].total += v.total;
            topicObj.difficultyCounts[k].correct += v.correct;
          }
        }

        // Mistakes aggregate
        topicObj.mistakes.push(...stats.mistakes);

        const attemptAccuracy = Math.round((stats.correct / Math.max(1, stats.total)) * 100);
        topicObj.scores.push(attemptAccuracy);
      }
    }

    // Compute derived metrics and classifications for each topic
    const result = [];
    for (const [topicName, data] of topicStatsMap.entries()) {
      const accuracy = Math.round((data.correctCount / Math.max(1, data.totalQuestions)) * 100);
      const incorrectCount = Math.max(0, data.totalQuestions - data.correctCount);
      const latestScore = data.scores[data.scores.length - 1];
      const recentWindow = data.scores.slice(-ADAPTIVE_CONFIG.recentAttemptsWindow);
      const averageScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);

      // Trend calculation across chronological quiz attempts
      let trend = "stable";
      if (data.scores.length >= 2) {
        // Check for mixed / fluctuating trend
        const deltas = [];
        for (let i = 1; i < data.scores.length; i++) {
          deltas.push(data.scores[i] - data.scores[i - 1]);
        }

        const hasSubstantialRise = deltas.some((d) => d >= 15);
        const hasSubstantialDrop = deltas.some((d) => d <= -15);

        if (hasSubstantialRise && hasSubstantialDrop) {
          trend = "mixed";
        } else {
          const delta = recentWindow[recentWindow.length - 1] - recentWindow[0];
          if (delta >= ADAPTIVE_CONFIG.improvingTrendThreshold) {
            trend = "improving";
          } else if (delta <= -ADAPTIVE_CONFIG.improvingTrendThreshold) {
            trend = "declining";
          } else if (accuracy >= ADAPTIVE_CONFIG.strongThreshold && data.scores.every((s) => s >= 75)) {
            trend = "consistently_strong";
          }
        }
      }

      // Minimum Evidence Threshold Evaluation
      const hasSufficientEvidence =
        data.totalQuestions >= ADAPTIVE_CONFIG.minEvidenceQuestions &&
        data.attempts >= ADAPTIVE_CONFIG.minEvidenceAttempts;

      const evidenceLevel = hasSufficientEvidence ? "confirmed" : "insufficient_data";
      const isProvisional = !hasSufficientEvidence;

      // Primary Topic Classification using configurable thresholds
      let classification = "needs_improvement";
      if (accuracy >= ADAPTIVE_CONFIG.strongThreshold) {
        classification = "strong";
      } else if (accuracy >= ADAPTIVE_CONFIG.inProgressThreshold) {
        classification = "in_progress";
      } else {
        classification = "needs_improvement";
      }

      // Deterministic learningState for backward compatibility with existing tests
      let learningState = "learning";
      if (
        accuracy >= ADAPTIVE_CONFIG.masteryAccuracyThreshold &&
        data.attempts >= ADAPTIVE_CONFIG.minimumAttemptsForMastery
      ) {
        learningState = "mastered";
      } else if (trend === "improving" && latestScore >= 60 && data.attempts >= 2) {
        learningState = "improving";
      } else if (accuracy < ADAPTIVE_CONFIG.weakAccuracyThreshold || latestScore < 50) {
        learningState = "needs_revision";
      } else if (trend === "declining") {
        learningState = "declining";
      } else if (latestScore >= 75 || accuracy >= 75) {
        learningState = "strong";
      }

      // Recommended Difficulty for this topic based on performance
      let recommendedDifficulty = "Intermediate";
      const recentScores = data.scores.slice(-2);
      if (recentScores.every((s) => s >= 80)) {
        recommendedDifficulty = "Advanced";
      } else if (latestScore < 50 || accuracy < 50) {
        recommendedDifficulty = "Beginner";
      }

      // Format difficulty breakdown
      const difficultyBreakdown = {};
      let hasDifficultyData = false;
      for (const [diffKey, dStats] of Object.entries(data.difficultyCounts)) {
        if (dStats.total > 0) {
          hasDifficultyData = true;
          difficultyBreakdown[diffKey] = {
            correct: dStats.correct,
            total: dStats.total,
            accuracy: Math.round((dStats.correct / dStats.total) * 100)
          };
        }
      }

      // Repeated mistake detection
      const repeatedMistakes = [];
      if (data.mistakes.length > 0) {
        // Group by explanation snippet or distinct question
        const mistakeGroups = new Map();
        for (const m of data.mistakes) {
          const key = m.explanation ? m.explanation.slice(0, 80) : m.question.slice(0, 80);
          if (key) {
            if (!mistakeGroups.has(key)) {
              mistakeGroups.set(key, { ...m, count: 0 });
            }
            mistakeGroups.get(key).count += 1;
          }
        }
        for (const [, item] of mistakeGroups.entries()) {
          repeatedMistakes.push({
            concept: item.explanation || `Question: ${item.question}`,
            occurrences: item.count,
            difficulty: item.difficulty
          });
        }
      }

      // Explanation & Next Action tailored to performance
      let explanation = "";
      let nextAction = "";
      let actionType = "quiz";

      if (classification === "strong") {
        explanation = isProvisional
          ? `High accuracy of ${accuracy}% based on ${data.totalQuestions} questions. Provisional classification pending further quiz verification.`
          : `Demonstrates solid mastery of '${topicName}' with ${accuracy}% accuracy across ${data.totalQuestions} questions.`;
        nextAction = "Practise more challenging questions and explore advanced concepts.";
        actionType = "quiz";
      } else if (classification === "in_progress") {
        explanation = `Partial understanding shown with ${accuracy}% accuracy (${data.correctCount}/${data.totalQuestions} correct). Consistency is developing.`;
        nextAction = "Review fundamentals, study a simplified explanation, and complete another practice quiz.";
        actionType = "summary";
      } else {
        explanation = `Accuracy is currently ${accuracy}% with ${incorrectCount} incorrect responses. Foundational review will boost confidence.`;
        nextAction = "Review core concepts with simple examples, then practise beginner-level questions.";
        actionType = "summary";
      }

      result.push({
        topic: topicName,
        bookId: data.bookId || bookId || null,
        attempts: data.attempts,
        totalQuestions: data.totalQuestions,
        correctCount: data.correctCount,
        incorrectCount,
        accuracy,
        latestScore,
        averageScore,
        trend,
        classification,
        learningState,
        evidenceLevel,
        isProvisional,
        evidenceExplanation: isProvisional
          ? `Building your learning profile (${data.totalQuestions} questions answered)`
          : `Confirmed understanding (${data.totalQuestions} questions across ${data.attempts} attempts)`,
        recommendedDifficulty,
        recentScores,
        hasDifficultyData,
        difficultyBreakdown: hasDifficultyData ? difficultyBreakdown : null,
        mistakes: repeatedMistakes.slice(0, 3),
        explanation,
        nextAction,
        actionType
      });
    }

    return result;
  }

  /**
   * 2. Detect Weak Topics for a User
   */
  static async detectWeakTopics(userId, bookId = null) {
    const topics = await this.getTopicPerformance(userId, bookId);
    return topics.filter(
      (t) =>
        t.classification === "needs_improvement" ||
        t.learningState === "needs_revision" ||
        t.learningState === "declining" ||
        t.accuracy < ADAPTIVE_CONFIG.weakAccuracyThreshold
    );
  }

  /**
   * 2b. Detect Strong Topics for a User
   */
  static async detectStrongTopics(userId, bookId = null) {
    const topics = await this.getTopicPerformance(userId, bookId);
    return topics.filter(
      (t) =>
        t.classification === "strong" ||
        t.learningState === "mastered" ||
        t.learningState === "strong" ||
        t.accuracy >= ADAPTIVE_CONFIG.masteryAccuracyThreshold
    );
  }

  /**
   * 3. Recommend Next Quiz Difficulty
   */
  static async getRecommendedDifficulty(userId, topicName = null, bookId = null) {
    const topics = await this.getTopicPerformance(userId, bookId);

    if (topics.length === 0) {
      return ADAPTIVE_CONFIG.defaultDifficulty;
    }

    if (topicName) {
      const match = topics.find((t) => t.topic.toLowerCase() === topicName.toLowerCase());
      if (match) {
        return match.recommendedDifficulty;
      }
      return ADAPTIVE_CONFIG.defaultDifficulty;
    }

    const weakCount = topics.filter((t) => t.classification === "needs_improvement" || t.learningState === "needs_revision" || t.learningState === "declining").length;
    const masterCount = topics.filter((t) => t.classification === "strong" || t.learningState === "mastered" || t.learningState === "strong").length;

    if (weakCount > topics.length / 2) {
      return "Beginner";
    }
    if (masterCount >= topics.length / 2 && topics.length > 0) {
      return "Advanced";
    }

    return ADAPTIVE_CONFIG.defaultDifficulty;
  }

  /**
   * 4. Generate Personalized Recommendations with Dynamic Reasons
   * Strictly based on actual student quiz history - no fake/starter fallbacks
   */
  static async generatePersonalizedRecommendations(userId, bookId = null) {
    const topicPerf = await this.getTopicPerformance(userId, bookId);

    if (topicPerf.length === 0) {
      return [];
    }

    const recommendations = [];

    // 1. Weak Topics (Needs Revision)
    const weakTopics = topicPerf.filter((t) => t.learningState === "needs_revision" || t.classification === "needs_improvement");
    for (const wt of weakTopics) {
      recommendations.push({
        id: `rec-weak-${wt.topic.replace(/\s+/g, "_")}`,
        type: "REVISION",
        topic: wt.topic,
        subject: "Targeted Remediation",
        reason: `Your accuracy in '${wt.topic}' is ${wt.accuracy}% (Latest score: ${wt.latestScore}%). Dedicated revision recommended.`,
        recommendedDifficulty: wt.recommendedDifficulty,
        estimatedMinutes: 10,
        actionType: "summary",
        bookId: wt.bookId || bookId,
        urgency: "High",
        badge: "Weak Topic Detected"
      });
    }

    // 2. Declining Topics (Skill Recovery)
    const decliningTopics = topicPerf.filter(
      (t) => t.learningState === "declining" || (t.trend === "declining" && t.learningState !== "needs_revision")
    );
    for (const dt of decliningTopics) {
      recommendations.push({
        id: `rec-dec-${dt.topic.replace(/\s+/g, "_")}`,
        type: "REVISION",
        topic: `${dt.topic} Practice`,
        subject: "Performance Recovery",
        reason: `Performance in '${dt.topic}' has declined recently (latest: ${dt.latestScore}%). Targeted revision and additional practice recommended.`,
        recommendedDifficulty: dt.recommendedDifficulty,
        estimatedMinutes: 10,
        actionType: "quiz",
        bookId: dt.bookId || bookId,
        urgency: "High",
        badge: "Declining Trend"
      });
    }

    // 3. Improving Topics (Keep Momentum)
    const improvingTopics = topicPerf.filter((t) => t.learningState === "improving" || t.trend === "improving");
    for (const it of improvingTopics) {
      recommendations.push({
        id: `rec-imp-${it.topic.replace(/\s+/g, "_")}`,
        type: "PRACTICE",
        topic: it.topic,
        subject: "Skill Reinforcement",
        reason: `Your score in '${it.topic}' is improving (+${it.latestScore - (it.recentScores[0] || 0)}% trend). Practice to solidify mastery.`,
        recommendedDifficulty: it.recommendedDifficulty,
        estimatedMinutes: 12,
        actionType: "quiz",
        bookId: it.bookId || bookId,
        urgency: "Medium",
        badge: "Improving Trend"
      });
    }

    // 4. Mastered Topics (Level Up Challenge)
    const masteredTopics = topicPerf.filter((t) => t.classification === "strong" || t.learningState === "mastered" || t.learningState === "strong");
    for (const mt of masteredTopics) {
      recommendations.push({
        id: `rec-mst-${mt.topic.replace(/\s+/g, "_")}`,
        type: "LEVEL_UP",
        topic: `${mt.topic} Advanced Challenge`,
        subject: "Mastery Application",
        reason: `Outstanding accuracy of ${mt.accuracy}% across ${mt.attempts} attempts in '${mt.topic}'! Ready for Advanced challenges.`,
        recommendedDifficulty: "Advanced",
        estimatedMinutes: 15,
        actionType: "quiz",
        bookId: mt.bookId || bookId,
        urgency: "Low",
        badge: mt.learningState === "mastered" ? "Mastery Level Up" : "Strength Reinforcement"
      });
    }

    return recommendations;
  }

  /**
   * 5. Analyze Chronological Progress Over Time
   */
  static async calculateProgressOverTime(userId, bookId = null) {
    let quizzes = await Quiz.findByUserId(userId || "usr_default");
    if ((!quizzes || quizzes.length === 0) && (!userId || userId === "usr_default")) {
      quizzes = await Quiz.findAll();
    }
    if (bookId) {
      quizzes = quizzes.filter((q) => q.book_id === bookId || q.bookId === bookId);
    }

    const submitted = (quizzes || [])
      .filter((q) => q.score !== null && q.score !== undefined)
      .sort((a, b) => new Date(a.taken_at || a.takenAt || 0) - new Date(b.taken_at || b.takenAt || 0));

    if (submitted.length === 0) {
      return {
        direction: "not_enough_data",
        delta: 0,
        message: "Complete quizzes to track your learning progress over time.",
        history: []
      };
    }

    if (submitted.length === 1) {
      return {
        direction: "not_enough_data",
        delta: 0,
        message: "Complete another quiz to track your progress.",
        history: [
          {
            quizId: submitted[0].id,
            percentage: submitted[0].percentage || 0,
            score: submitted[0].score || 0,
            totalQuestions: submitted[0].totalQuestions || 0,
            takenAt: submitted[0].taken_at || submitted[0].takenAt
          }
        ]
      };
    }

    const history = submitted.map((q) => ({
      quizId: q.id,
      percentage: q.percentage || 0,
      score: q.score || 0,
      totalQuestions: q.totalQuestions || 0,
      performanceLevel: q.performanceLevel,
      takenAt: q.taken_at || q.takenAt
    }));

    const firstScore = history[0].percentage;
    const latestScore = history[history.length - 1].percentage;
    const delta = latestScore - firstScore;

    let direction = "consistent";
    let message = "Your understanding has remained consistent across assessments.";

    if (delta >= 8) {
      direction = "improving";
      message = `Your performance is improving (+${delta}% since initial attempt). Keep up the great work!`;
    } else if (delta <= -8) {
      direction = "declining";
      message = `Recent scores dipped by ${Math.abs(delta)}%. Review recommended summaries to recover your edge.`;
    }

    return {
      direction,
      delta,
      message,
      firstScore,
      latestScore,
      history
    };
  }

  /**
   * 6. Generate Ordered Personalized Learning Path
   * Translates performance analysis into an ordered, actionable 5-step study plan.
   */
  static async generateOrderedLearningPath(userId, bookId = null, topicPerformance = []) {
    let targetBookId = bookId;
    if (!targetBookId) {
      const latestBook = await Book.findLatestByUserId(userId);
      if (latestBook) {
        targetBookId = latestBook.id;
      }
    }

    const weakList = topicPerformance.filter((t) => t.classification === "needs_improvement" || t.learningState === "needs_revision");
    const progressList = topicPerformance.filter((t) => t.classification === "in_progress" || t.learningState === "improving");
    const strongList = topicPerformance.filter((t) => t.classification === "strong" || t.learningState === "mastered");

    const steps = [];

    // Step 1: Revise Highest-Priority Weak Topic
    if (weakList.length > 0) {
      const highestWeak = weakList.sort((a, b) => a.accuracy - b.accuracy)[0];
      steps.push({
        step: 1,
        title: `Revise ${highestWeak.topic}`,
        topic: highestWeak.topic,
        reason: `Accuracy is currently ${highestWeak.accuracy}%. Reviewing key concepts will rebuild fundamentals.`,
        currentPerformance: `${highestWeak.accuracy}% Accuracy (${highestWeak.correctCount}/${highestWeak.totalQuestions})`,
        suggestedActivity: "Read textbook summary and focus on core definitions.",
        estimatedEffort: "10-15 mins",
        actionText: "Review Summary",
        actionType: "summary",
        bookId: highestWeak.bookId || targetBookId,
        priority: "High"
      });
    } else if (progressList.length > 0) {
      const target = progressList[0];
      steps.push({
        step: 1,
        title: `Consolidate ${target.topic}`,
        topic: target.topic,
        reason: `Accuracy is ${target.accuracy}%. A quick refresher will move this to confirmed mastery.`,
        currentPerformance: `${target.accuracy}% Accuracy`,
        suggestedActivity: "Review quick revision notes.",
        estimatedEffort: "8-10 mins",
        actionText: "Review Summary",
        actionType: "summary",
        bookId: target.bookId || targetBookId,
        priority: "Medium"
      });
    }

    // Step 2: Read Simplified Explanation / Address Mistakes
    const topicWithMistakes = topicPerformance.find((t) => t.mistakes && t.mistakes.length > 0) || weakList[0] || progressList[0];
    if (topicWithMistakes) {
      steps.push({
        step: 2,
        title: `Address Mistakes in ${topicWithMistakes.topic}`,
        topic: topicWithMistakes.topic,
        reason: topicWithMistakes.mistakes && topicWithMistakes.mistakes.length > 0
          ? `Identified recurring questions that need clarification.`
          : `Study simplified explanations to eliminate lingering doubts.`,
        currentPerformance: `${topicWithMistakes.accuracy}% Accuracy`,
        suggestedActivity: "Ask AI Tutor or read concise chapter summaries.",
        estimatedEffort: "5-10 mins",
        actionText: "Clear Doubts",
        actionType: "doubts",
        bookId: topicWithMistakes.bookId || targetBookId,
        priority: "High"
      });
    }

    // Step 3: Targeted Practice Questions
    const practiceTarget = progressList[0] || weakList[0] || topicPerformance[0];
    if (practiceTarget) {
      steps.push({
        step: 3,
        title: `Complete Targeted Practice on ${practiceTarget.topic}`,
        topic: practiceTarget.topic,
        reason: `Reinforce concepts through active recall and targeted question practice.`,
        currentPerformance: `${practiceTarget.accuracy}% Accuracy`,
        suggestedActivity: `Take a practice quiz on ${practiceTarget.recommendedDifficulty} difficulty.`,
        estimatedEffort: "10-12 mins",
        actionText: "Practise Questions",
        actionType: "quiz",
        difficulty: practiceTarget.recommendedDifficulty,
        bookId: practiceTarget.bookId || targetBookId,
        priority: "Medium"
      });
    }

    // Step 4: Follow-up Quiz to Evaluate Improvement
    steps.push({
      step: 4,
      title: "Take Evaluative Follow-Up Quiz",
      topic: "Adaptive Assessment",
      reason: "Measure score improvements and verify concept mastery after revision.",
      currentPerformance: "Pending Follow-up",
      suggestedActivity: "Take a 5-question adaptive quiz covering revised topics.",
      estimatedEffort: "5-8 mins",
      actionText: "Take a Quiz",
      actionType: "quiz",
      bookId: targetBookId,
      priority: "Medium"
    });

    // Step 5: Level-Up Challenge on Strong Topics
    if (strongList.length > 0) {
      const strongest = strongList[0];
      steps.push({
        step: 5,
        title: `Advanced Challenge: ${strongest.topic}`,
        topic: strongest.topic,
        reason: `Solid ${strongest.accuracy}% mastery! Challenge yourself with advanced application problems.`,
        currentPerformance: `${strongest.accuracy}% Accuracy (Confirmed)`,
        suggestedActivity: "Solve Advanced-level questions and explore real-world problems.",
        estimatedEffort: "12-15 mins",
        actionText: "Practise Advanced",
        actionType: "quiz",
        difficulty: "Advanced",
        bookId: strongest.bookId || targetBookId,
        priority: "Low"
      });
    }

    return steps;
  }

  /**
   * 7. Synthesize AI Personalized Learning Insights using Gemini with Deterministic Fallbacks
   */
  static async generateAiLearningInsights({ userId, bookId, topicPerformance, progressOverTime }) {
    if (!topicPerformance || topicPerformance.length === 0) {
      return null;
    }

    // Check cache
    const cacheKey = `${userId || "default"}_${bookId || "all"}_${topicPerformance.length}_${progressOverTime.latestScore || 0}`;
    const cached = aiInsightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
      return cached.data;
    }

    // Deterministic fallback generator
    const generateFallback = (isError = false) => {
      const weak = topicPerformance.filter((t) => t.classification === "needs_improvement");
      const inProg = topicPerformance.filter((t) => t.classification === "in_progress");
      const strong = topicPerformance.filter((t) => t.classification === "strong");

      let summaryText = "";
      if (weak.length > 0) {
        summaryText = `Focus needed on ${weak.map((w) => `'${w.topic}'`).join(", ")}. Prioritizing core definitions will quickly improve your scores.`;
      } else if (inProg.length > 0) {
        summaryText = `Steady progress in ${inProg.map((p) => `'${p.topic}'`).join(", ")}. You are close to mastering these topics.`;
      } else {
        summaryText = `Excellent mastery across all assessed topics (${strong.map((s) => `'${s.topic}'`).join(", ")}). You are ready for advanced challenges.`;
      }

      return {
        isAiGenerated: false,
        isFallback: true,
        summary: summaryText,
        gapAnalysis: weak.length > 0
          ? `Identified conceptual gaps in ${weak[0].topic} (${weak[0].accuracy}% accuracy). Revisit textbook summaries before retesting.`
          : `No critical conceptual gaps detected. Focus on solidifying developing concepts.`,
        studyStrategy: [
          weak.length > 0 ? `1. Revise ${weak[0].topic} via textbook summary.` : `1. Practise intermediate questions on ${inProg[0]?.topic || "core topics"}.`,
          `2. Practice 5-10 targeted questions to reinforce recall.`,
          `3. Take a diagnostic quiz to track score improvements.`
        ],
        encouragingNote: `Consistent practice is the key to mastery. Every quiz helps tailor your learning curve!`
      };
    };

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey || env.NODE_ENV === "test") {
      return generateFallback(false);
    }

    try {
      const promptData = topicPerformance.map((t) => ({
        topic: t.topic,
        accuracy: `${t.accuracy}%`,
        questions: t.totalQuestions,
        classification: t.classification,
        trend: t.trend,
        mistakesCount: t.mistakes?.length || 0
      }));

      const prompt = `You are an educational AI tutor analyzing student quiz data.
Based strictly on the calculated performance data below, generate an encouraging, personalized study plan.
Do NOT invent numbers or fabricate mastery that isn't supported by the data.

Student Topic Performance Data:
${JSON.stringify(promptData, null, 2)}
Overall Progress Direction: ${progressOverTime.direction} (${progressOverTime.message})

Return ONLY a valid JSON object matching this schema:
{
  "summary": "1-2 sentence overall learning diagnosis based on the real data...",
  "gapAnalysis": "Short description of specific areas needing revision or 'No critical gaps' if all strong...",
  "studyStrategy": ["Step 1 recommendation...", "Step 2 recommendation...", "Step 3 recommendation..."],
  "encouragingNote": "Inspiring closing encouragement..."
}`;

      const raw = await AiSummaryService.callGeminiApiWithRetry(prompt, { timeoutMs: 12000, maxRetries: 2 });
      const parsed = AiSummaryService.parseJsonFromGemini(raw);

      if (parsed && parsed.summary && Array.isArray(parsed.studyStrategy)) {
        const result = {
          isAiGenerated: true,
          isFallback: false,
          summary: parsed.summary,
          gapAnalysis: parsed.gapAnalysis || "Continuous revision advised.",
          studyStrategy: parsed.studyStrategy,
          encouragingNote: parsed.encouragingNote || "Keep going!"
        };
        aiInsightsCache.set(cacheKey, { timestamp: Date.now(), data: result });
        return result;
      }

      return generateFallback(true);
    } catch (err) {
      console.warn("[AdaptiveLearningService] Gemini insights fallback triggered:", err.message);
      return generateFallback(true);
    }
  }

  /**
   * 8. Full Adaptive Learning Dashboard Endpoint Helper
   */
  static async getAdaptiveDashboard(userId, bookId = null) {
    if (bookId) {
      const book = await Book.findById(bookId);
      if (!book) {
        const err = new Error("Textbook not found.");
        err.statusCode = 404;
        throw err;
      }
    }

    const topicPerformance = await this.getTopicPerformance(userId, bookId);
    const progressOverTime = await this.calculateProgressOverTime(userId, bookId);

    // Group topics
    const strongTopics = topicPerformance.filter((t) => t.classification === "strong");
    const inProgressTopics = topicPerformance.filter((t) => t.classification === "in_progress");
    const needsImprovementTopics = topicPerformance.filter((t) => t.classification === "needs_improvement");

    // Legacy groups for backward compatibility
    const weakTopics = topicPerformance.filter((t) => t.learningState === "needs_revision" || t.learningState === "declining");
    const improvingTopics = topicPerformance.filter((t) => t.learningState === "improving");
    const masteredTopics = topicPerformance.filter((t) => t.learningState === "mastered");

    const recommendations = await this.generatePersonalizedRecommendations(userId, bookId);
    const recommendedDifficulty = await this.getRecommendedDifficulty(userId, null, bookId);
    const orderedLearningPath = await this.generateOrderedLearningPath(userId, bookId, topicPerformance);
    const progressAggregate = await Progress.getAggregateForUser(userId);

    // Generate AI Insights
    const aiInsights = await this.generateAiLearningInsights({
      userId,
      bookId,
      topicPerformance,
      progressOverTime
    });

    const totalAnsweredQuestions = topicPerformance.reduce((acc, t) => acc + t.totalQuestions, 0);

    const overallProgress = topicPerformance.length > 0
      ? Math.round(topicPerformance.reduce((acc, t) => acc + t.accuracy, 0) / topicPerformance.length)
      : progressAggregate.average_score || 0;

    const overview = {
      strongTopicsCount: strongTopics.length,
      inProgressTopicsCount: inProgressTopics.length,
      needsImprovementTopicsCount: needsImprovementTopics.length,
      overallProgress,
      totalAnsweredQuestions,
      totalQuizzesTaken: progressAggregate.quizzes_taken || 0,
      hasSufficientHistory: topicPerformance.length > 0
    };

    return {
      overview,
      overallProgress,
      totalQuizzesTaken: progressAggregate.quizzes_taken,
      totalSummariesGenerated: progressAggregate.summaries_count,
      topicPerformance,
      strongestTopics: strongTopics,
      inProgressTopics,
      needsImprovementTopics,
      // Legacy properties preserved for tests
      weakTopics,
      strongTopics,
      improvingTopics,
      masteredTopics,
      recommendations,
      recommendedDifficulty,
      learningPath: orderedLearningPath,
      orderedLearningPath,
      progressOverTime,
      aiInsights,
      insufficientHistory: topicPerformance.length === 0
    };
  }
}

