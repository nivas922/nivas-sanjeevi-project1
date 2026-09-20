import { AdaptiveLearningService } from "./adaptiveLearningService.js";

export const recommendationService = {
  getRecommendations: async (userId, bookId = null) => {
    return await AdaptiveLearningService.generatePersonalizedRecommendations(userId, bookId);
  }
};
export default recommendationService;
