import { AiService } from "./aiService.js";

export const quizGenService = {
  generateQuizQuestions: (params) => AiService.generateQuizQuestions(params)
};
export default quizGenService;
