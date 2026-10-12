import { api } from "./api";

export const summaryService = {
  getSummaries: () => api.getSummaries(),
  getSummaryById: (id) => api.getSummaryById(id),
  translateSummary: (id, targetLang, summary = null) => api.translateSummary(id, targetLang, summary)
};

export default summaryService;
