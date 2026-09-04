import { AiService } from "./aiService.js";

export const aiSummaryService = {
  generateSummary: (params) => AiService.generateSummary(params)
};
export default aiSummaryService;
