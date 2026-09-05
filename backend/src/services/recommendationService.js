import { Progress } from "../models/Progress.js";
import { Quiz } from "../models/Quiz.js";

export const recommendationService = {
  getRecommendations: async (userId) => {
    const progressList = await Progress.findByUserId(userId);
    const quizzes = await Quiz.findByUserId(userId);
    const recommendations = [];

    if (quizzes.length > 0) {
      const lastQuiz = quizzes[0];
      if (lastQuiz.percentage < 60) {
        recommendations.push({
          id: `rec-${Date.now()}`,
          topic: `${lastQuiz.questions?.[0]?.topic || "Core Fundamentals"} - Foundations`,
          reason: `Recent score was ${lastQuiz.percentage}%. Remedial revision recommended.`,
          recommendedDifficulty: "Beginner",
          actionType: "summary",
          urgency: "High"
        });
      } else if (lastQuiz.percentage >= 80) {
        recommendations.push({
          id: `rec-${Date.now()}`,
          topic: `${lastQuiz.questions?.[0]?.topic || "Advanced Systems"} - Level Up`,
          reason: `High score of ${lastQuiz.percentage}%! Ready for advanced challenges.`,
          recommendedDifficulty: "Advanced",
          actionType: "quiz",
          urgency: "Low"
        });
      }
    }
    return recommendations;
  }
};
export default recommendationService;
