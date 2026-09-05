import { api } from "./api";

export const quizService = {
  generateQuiz: (params) => api.generateQuiz(params),
  submitQuiz: (submission) => api.submitQuiz(submission),
  getRecommendations: () => api.getRecommendations()
};

export default quizService;
