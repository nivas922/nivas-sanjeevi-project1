import { api } from "./api";

export const summaryService = {
  getSummaries: () => api.getSummaries(),
  getSummaryById: (id) => api.getSummaryById(id),
  translateSummary: (id, targetLang) => api.translateSummary(id, targetLang)
};

export default summaryService;
