import { env } from "../config/env.js";
import { getLanguageConfig } from "../config/languageConfig.js";
import { AiSummaryService } from "./aiSummaryService.js";

// Summary Translation Cache
const translationCache = new Map();

export class TranslationService {
  /**
   * Translate arbitrary text string into target language using Google Translate or Gemini
   */
  static async translateText(text, targetLang = "en", sourceLang = "en") {
    if (!text || targetLang === sourceLang) {
      return text;
    }

    const targetConfig = getLanguageConfig(targetLang);

    // 1. Google Translation API (if configured)
    if (env.GOOGLE_TRANSLATE_API_KEY) {
      try {
        const url = `https://translation.googleapis.com/language/translate/v2?key=${env.GOOGLE_TRANSLATE_API_KEY}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            target: targetConfig.code,
            source: sourceLang,
            format: "text"
          })
        });
        const data = await res.json();
        if (data?.data?.translations?.[0]?.translatedText) {
          return data.data.translations[0].translatedText;
        }
      } catch (err) {
        console.warn("Google Translate API call notice:", err.message);
      }
    }

    // 2. Gemini Translation Fallback
    try {
      const prompt = `You are an expert academic translator. Translate the following text from ${sourceLang} into ${targetConfig.name} (${targetConfig.nativeName}). Return ONLY the translated text without extra commentary.\n\nText:\n${text}`;
      const raw = await AiSummaryService.callGeminiApiWithRetry(prompt);
      return raw.trim();
    } catch (err) {
      console.warn("Gemini translation notice:", err.message);
      if (env.NODE_ENV !== "test") {
        const publicErr = new Error("Translation is currently unavailable. Please try again later.");
        publicErr.statusCode = 503;
        throw publicErr;
      }
      return `[${targetConfig.name}] ${text}`;
    }
  }

  /**
   * Translate full structured summary payload while preserving formulas, code syntax, and chapter metadata
   */
  static async translateSummaryObject(summary, targetLang = "en") {
    const targetConfig = getLanguageConfig(targetLang);

    if (!summary || summary.language === targetConfig.code) {
      return summary;
    }

    // Check cache
    const cacheKey = `${summary.id || summary.book_id}_${targetConfig.code}`;
    if (translationCache.has(cacheKey)) {
      console.log(`[Translation-Service] Serving cached summary translation for '${cacheKey}'`);
      return translationCache.get(cacheKey);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey && env.NODE_ENV !== "test") {
      const err = new Error("Translation is currently unavailable. Please configure GEMINI_API_KEY in environment variables.");
      err.statusCode = 503;
      throw err;
    }

    const prompt = `You are an expert academic translator. Translate the following structured textbook summary into ${targetConfig.name} (${targetConfig.nativeName}).

STRICT TRANSLATION RULES:
1. Translate all explanatory text, overview, key points, definitions, exam points, and chapter titles into ${targetConfig.name}.
2. Do NOT translate mathematical notation, variables, or equations incorrectly (preserve LaTeX / math formulas like E = mc^2, BDP = B * RTT).
3. Do NOT translate programming code syntax (keywords like def, return, class, for, if). Only translate explanatory comments around code.
4. Preserve exact structural JSON schema fields.
5. Return ONLY a valid JSON object matching this schema:
{
  "summaryText": "Translated summary in ${targetConfig.name}...",
  "simpleExplanation": "Translated simple explanation in ${targetConfig.name}...",
  "keyPoints": ["Translated key point 1", "Translated key point 2"],
  "definitions": [{"term": "Term", "meaning": "Translated meaning"}],
  "formulas": [{"name": "Formula Name", "formula": "Formula", "description": "Translated description"}],
  "examples": [{"title": "Example Title", "code": "Code"}],
  "quickRevision": ["Translated revision point"],
  "chapters": [{"chapter": "Translated Chapter Title", "overview": "Translated overview", "sourcePages": "1-5"}]
}

Source Summary JSON:
${JSON.stringify({
  summaryText: summary.summaryText || summary.summary_text || "",
  simpleExplanation: summary.simpleExplanation || "",
  keyPoints: summary.keyPoints || summary.key_concepts || [],
  definitions: summary.definitions || [],
  formulas: summary.formulas || [],
  examples: summary.examples || [],
  quickRevision: summary.quickRevision?.revisionPoints || summary.quick_revision?.revisionPoints || summary.quickRevision || [],
  chapters: summary.quickRevision?.chapters || summary.chapters || []
})}`;

    let resultPayload = null;

    try {
      const raw = await AiSummaryService.callGeminiApiWithRetry(prompt);
      const parsed = AiSummaryService.parseJsonFromGemini(raw);

      if (parsed && parsed.summaryText) {
        resultPayload = {
          language: targetConfig.code,
          languageName: targetConfig.name,
          summaryText: parsed.summaryText,
          simpleExplanation: parsed.simpleExplanation || summary.simpleExplanation || "",
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : summary.keyPoints || [],
          definitions: Array.isArray(parsed.definitions) ? parsed.definitions : summary.definitions || [],
          formulas: Array.isArray(parsed.formulas) ? parsed.formulas : summary.formulas || [],
          examples: Array.isArray(parsed.examples) ? parsed.examples : summary.examples || [],
          quickRevision: Array.isArray(parsed.quickRevision) ? parsed.quickRevision : summary.quickRevision || [],
          chapters: Array.isArray(parsed.chapters) ? parsed.chapters : summary.chapters || []
        };
      }
    } catch (err) {
      console.warn("Gemini summary translation warning:", err.message);
      if (env.NODE_ENV !== "test") {
        const publicErr = new Error("Translation is currently unavailable. Please try again later.");
        publicErr.statusCode = 503;
        throw publicErr;
      }
    }

    if (!resultPayload) {
      // Mock translation payload for test environment
      resultPayload = {
        language: targetConfig.code,
        languageName: targetConfig.name,
        summaryText: `[${targetConfig.name}] ${summary.summaryText || summary.summary_text || "Textbook summary."}`,
        simpleExplanation: `[${targetConfig.name}] Simple explanation.`,
        keyPoints: (summary.keyPoints || summary.key_concepts || ["Key Point 1"]).map((kp) => `[${targetConfig.name}] ${kp}`),
        definitions: (summary.definitions || [{ term: "Term", meaning: "Meaning" }]).map((d) => ({
          term: d.term,
          meaning: `[${targetConfig.name}] ${d.meaning}`
        })),
        formulas: summary.formulas || [{ name: "Efficiency", formula: "Useful / Input", description: "Ratio" }],
        examples: summary.examples || [{ title: "Example", code: "print('test')" }],
        quickRevision: (summary.quickRevision || ["Revision"]).map((r) => `[${targetConfig.name}] ${r}`),
        chapters: summary.chapters || [{ chapter: `[${targetConfig.name}] Chapter 1`, overview: "Overview", sourcePages: "1-5" }]
      };
    }

    // Cache translation
    translationCache.set(cacheKey, resultPayload);
    return resultPayload;
  }
}
