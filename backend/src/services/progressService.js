import { Progress } from "../models/Progress.js";

export const progressService = {
  getUserProgress: (userId) => Progress.getAggregateForUser(userId),
  recordSummary: (userId, subject) => Progress.incrementSummaryCount(userId, subject),
  recordQuizScore: (userId, subject, score) => Progress.recordQuizScore(userId, subject, score)
};
export default progressService;
