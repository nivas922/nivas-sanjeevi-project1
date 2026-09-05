import { api } from "./api";

export const ttsService = {
  textToSpeech: (text, language) => api.textToSpeech(text, language)
};

export default ttsService;
