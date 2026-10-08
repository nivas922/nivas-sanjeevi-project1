import { Quiz } from "../models/Quiz.js";
import { Book } from "../models/Book.js";
import { Progress } from "../models/Progress.js";
import { DocumentChunk } from "../models/DocumentChunk.js";

export const ADAPTIVE_CONFIG = {
  weakAccuracyThreshold: 60,
  masteryAccuracyThreshold: 85,
  improvingTrendThreshold: 10,
  minimumAttemptsForMastery: 2,
  recentAttemptsWindow: 3,
  difficultyProgressionWindow: 2,
  difficultyReductionWindow: 1,
  defaultDifficulty: "Intermediate"
};

export class AdaptiveLearningService {
  /**
   * 1. Calculate topic-level performance metrics for a user
   */
  static async getTopicPerformance(userId, bookId = null) {
    let quizzes = await Quiz.findByUserId(userId);
    if (bookId) {
      quizzes = quizzes.filter((q) => q.book_id === bookId || q.bookId === bookId);
    }

    if (!quizzes || quizzes.length === 0) {
      return [];
    }

    // Map to group performance per topic
    const topicStatsMap = new Map();

    // Process quizzes chronologically (oldest to newest) to track progression
    const sortedQuizzes = [...quizzes].sort((a, b) => new Date(a.taken_at || 0) - new Date(b.taken_at || 0));

    for (const quiz of sortedQuizzes) {
      const answers = quiz.answers || [];
      const questions = quiz.questions || [];

      // Map question topics from answers or question array
      const questionTopicMap = new Map();
      questions.forEach((q, idx) => {
        questionTopicMap.set(q.id || `q_${idx}`, q.topic || q.chapter || "Core Concepts");
      });

      // Group correct vs total for this specific quiz attempt
      const attemptTopicGroup = new Map();

      if (answers.length > 0) {
        answers.forEach((ans, idx) => {
          const topicName = ans.topic || questionTopicMap.get(ans.questionId) || "Core Concepts";
          if (!attemptTopicGroup.has(topicName)) {
            attemptTopicGroup.set(topicName, { correct: 0, total: 0 });
          }
          const group = attemptTopicGroup.get(topicName);
          group.total += 1;
          if (ans.isCorrect) {
            group.correct += 1;
          }
        });
      } else {
        // Fallback for unsubmitted / legacy quiz records
        const topicName = questions[0]?.topic || "Core Concepts";
        attemptTopicGroup.set(topicName, {
          correct: quiz.score || 0,
          total: quiz.totalQuestions || questions.length || 1
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
            scores: []
          });
        }

        const topicObj = topicStatsMap.get(topicName);
        topicObj.attempts += 1;
        topicObj.totalQuestions += stats.total;
        topicObj.correctCount += stats.correct;

        const attemptAccuracy = Math.round((stats.correct / Math.max(1, stats.total)) * 100);
        topicObj.scores.push(attemptAccuracy);
      }
    }

    // Compute derived metrics for each topic
    const result = [];
    for (const [topicName, data] of topicStatsMap.entries()) {
      const accuracy = Math.round((data.correctCount / Math.max(1, data.totalQuestions)) * 100);
      const latestScore = data.scores[data.scores.length - 1];
      const recentWindow = data.scores.slice(-ADAPTIVE_CONFIG.recentAttemptsWindow);
      const averageScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);

      // Trend calculation
      let trend = "stable";
      if (data.scores.length >= 2) {
        // Check for mixed / fluctuating trend (both significant positive and negative steps)
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
          }
        }
      }

      // Learning State Classification (Deterministic & Explainable)
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

      // Recommended Difficulty for this topic
      let recommendedDifficulty = "Intermediate";
      const recentScores = data.scores.slice(-2);
      if (recentScores.every((s) => s >= 80)) {
        recommendedDifficulty = "Advanced";
      } else if (latestScore < 50) {
        recommendedDifficulty = "Beginner";
      }

      result.push({
        topic: topicName,
        bookId: data.bookId || bookId || null,
        attempts: data.attempts,
        totalQuestions: data.totalQuestions,
        correctCount: data.correctCount,
        accuracy,
        latestScore,
        averageScore,
        trend,
        learningState,
        recommendedDifficulty,
        recentScores
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

    // Book / Global overall recommended difficulty
    const weakCount = topics.filter((t) => t.learningState === "needs_revision" || t.learningState === "declining").length;
    const masterCount = topics.filter((t) => t.learningState === "mastered" || t.learningState === "strong").length;

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

    // If no performance data exists, return empty array without fabricating recommendations
    if (topicPerf.length === 0) {
      return [];
    }

    const recommendations = [];

    // 1. Weak Topics (Needs Revision)
    const weakTopics = topicPerf.filter((t) => t.learningState === "needs_revision");
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
    const improvingTopics = topicPerf.filter((t) => t.learningState === "improving");
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
    const masteredTopics = topicPerf.filter((t) => t.learningState === "mastered" || t.learningState === "strong");
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
   * 5. Generate Personalized Learning Path based on Textbook Chunks & Progress
   */
  static async generateLearningPath(userId, bookId = null) {
    let targetBookId = bookId;
    if (!targetBookId) {
      const latestBook = await Book.findLatestByUserId(userId);
      if (latestBook) {
        targetBookId = latestBook.id;
      }
    }

    if (!targetBookId) {
      return [];
    }

    const book = await Book.findById(targetBookId);
    if (!book) return [];

    const chunks = await DocumentChunk.findByBookId(targetBookId);
    const topicPerf = await this.getTopicPerformance(userId, targetBookId);

    // Group chunks by chapter
    const chapterMap = new Map();

    if (chunks && chunks.length > 0) {
      for (const chunk of chunks) {
        const chapTitle = chunk.chapter || "Chapter 1: Overview";
        if (!chapterMap.has(chapTitle)) {
          chapterMap.set(chapTitle, {
            chapter: chapTitle,
            sections: new Set(),
            pageStart: chunk.pageStart || 1,
            pageEnd: chunk.pageEnd || 1
          });
        }
        const chap = chapterMap.get(chapTitle);
        if (chunk.section) chap.sections.add(chunk.section);
        chap.pageEnd = Math.max(chap.pageEnd, chunk.pageEnd || 1);
      }
    }

    const learningPath = [];
    const chaptersList = Array.from(chapterMap.values());

    if (chaptersList.length > 0) {
      chaptersList.forEach((c, idx) => {
        // Find if topic matching chapter has performance data
        const matchedTopic = topicPerf.find(
          (t) => t.topic.toLowerCase().includes(c.chapter.toLowerCase()) || c.chapter.toLowerCase().includes(t.topic.toLowerCase())
        );

        let status = "upcoming";
        let action = "Study Summary";
        let recommendedDifficulty = "Intermediate";

        if (matchedTopic) {
          if (matchedTopic.learningState === "mastered") {
            status = "completed";
            action = "Mastered (Optional Challenge)";
            recommendedDifficulty = "Advanced";
          } else if (matchedTopic.learningState === "needs_revision") {
            status = "needs_revision";
            action = "Review Weak Concepts";
            recommendedDifficulty = "Beginner";
          } else {
            status = "in_progress";
            action = "Take Diagnostic Quiz";
            recommendedDifficulty = matchedTopic.recommendedDifficulty;
          }
        } else if (idx === 0) {
          status = "in_progress";
          action = "Take Starter Quiz";
        }

        learningPath.push({
          step: idx + 1,
          chapter: c.chapter,
          sectionsCount: c.sections.size || 1,
          pages: `${c.pageStart}-${c.pageEnd}`,
          status,
          action,
          recommendedDifficulty
        });
      });
    }

    return learningPath;
  }

  /**
   * 6. Full Adaptive Learning Dashboard Endpoint Helper
   */
  static async getAdaptiveDashboard(userId, bookId = null) {
    if (bookId) {
      const book = await Book.findById(bookId);
      if (book && book.user_id && book.user_id !== userId) {
        const err = new Error("You do not have authorization to access adaptive learning data for this textbook.");
        err.statusCode = 403;
        throw err;
      }
    }

    const topicPerformance = await this.getTopicPerformance(userId, bookId);
    const weakTopics = topicPerformance.filter((t) => t.learningState === "needs_revision" || t.learningState === "declining");
    const strongTopics = topicPerformance.filter((t) => t.learningState === "mastered" || t.learningState === "strong");
    const improvingTopics = topicPerformance.filter((t) => t.learningState === "improving");
    const masteredTopics = topicPerformance.filter((t) => t.learningState === "mastered");
    const recommendations = await this.generatePersonalizedRecommendations(userId, bookId);
    const recommendedDifficulty = await this.getRecommendedDifficulty(userId, null, bookId);
    const learningPath = await this.generateLearningPath(userId, bookId);
    const progressAggregate = await Progress.getAggregateForUser(userId);

    const overallProgress = topicPerformance.length > 0
      ? Math.round(topicPerformance.reduce((acc, t) => acc + t.accuracy, 0) / topicPerformance.length)
      : progressAggregate.average_score || 0;

    return {
      overallProgress,
      totalQuizzesTaken: progressAggregate.quizzes_taken,
      totalSummariesGenerated: progressAggregate.summaries_count,
      topicPerformance,
      weakTopics,
      strongTopics,
      improvingTopics,
      masteredTopics,
      recommendations,
      recommendedDifficulty,
      learningPath,
      insufficientHistory: topicPerformance.length === 0
    };
  }
}
