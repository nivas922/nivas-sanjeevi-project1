import { api } from "./api";

export const progressService = {
  getProgress: () => api.getAnalytics(),
  getRecommendations: () => api.getRecommendations()
};

export default progressService;
