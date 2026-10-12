import assert from "assert";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { SUPPORTED_LANGUAGES, isLanguageSupported } from "../src/config/languageConfig.js";
import { TranslationService } from "../src/services/translationService.js";
import { AiSummaryService } from "../src/services/aiSummaryService.js";
import { aiConfig } from "../src/config/aiConfig.js";
import { Summary } from "../src/models/Summary.js";
import { Book } from "../src/models/Book.js";
import { dbRun } from "../src/config/db.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const PORT = 5592;
let server;
const BASE_URL = `http://localhost:${PORT}/api`;

const runVerification = async () => {
  console.log("\n🧪 Running Comprehensive Translation & Multilingual Verification Test Suite...\n");

  await dbRun("DELETE FROM summaries WHERE id LIKE 'sum-verify-%'");
  await dbRun("DELETE FROM books WHERE id LIKE 'book-verify-%'");

  server = app.listen(PORT);
  console.log(` Test server running on port ${PORT}\n`);

  try {
    // -------------------------------------------------------------
    // TEST 1: Direct Unauthenticated Access to POST /api/translate
    // -------------------------------------------------------------
    console.log("[Test 1] POST /api/translate works without authentication token");
    const sampleText = "The Transmission Control Protocol ensures reliable data stream delivery.";
    const noAuthRes = await fetch(`${BASE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: sampleText,
        target_language: "ta",
        source_language: "en"
      })
    });
    const noAuthData = await noAuthRes.json();
    assert.strictEqual(noAuthRes.status, 200, "Should allow unauthenticated translation request");
    assert.strictEqual(noAuthData.success, true);
    assert.strictEqual(noAuthData.language, "ta");
    assert.ok(noAuthData.text && typeof noAuthData.text === "string");
    console.log("  PASSED: Public no-login access to translation endpoint verified.\n");

    // -------------------------------------------------------------
    // TEST 2: All 7 Supported Languages Accepted on POST /api/translate
    // -------------------------------------------------------------
    console.log("[Test 2] POST /api/translate accepts all 7 supported Indian languages");
    const supportedCodes = ["en", "ta", "hi", "te", "kn", "ml", "bn"];
    for (const code of supportedCodes) {
      assert.strictEqual(isLanguageSupported(code), true, `Code '${code}' should be in SUPPORTED_LANGUAGES`);
      const transRes = await fetch(`${BASE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Operating systems manage hardware memory, CPU scheduling, and file systems.",
          target_language: code,
          source_language: "en"
        })
      });
      assert.strictEqual(transRes.status, 200, `Language '${code}' should return 200 OK`);
      const transData = await transRes.json();
      assert.strictEqual(transData.success, true);
      assert.strictEqual(transData.language, code);
      assert.ok(transData.translatedText && transData.translatedText.length > 0);
    }
    console.log("  PASSED: All 7 supported languages successfully processed.\n");

    // -------------------------------------------------------------
    // TEST 3: Unsupported Target Language Rejected with 400 Bad Request
    // -------------------------------------------------------------
    console.log("[Test 3] Unsupported target languages are rejected with HTTP 400");
    const invalidLangs = ["es", "fr", "de", "japanese", "invalid_123", "!@#"];
    for (const inv of invalidLangs) {
      assert.strictEqual(isLanguageSupported(inv), false);
      const res = await fetch(`${BASE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Machine learning algorithms optimize mathematical loss functions.",
          target_language: inv
        })
      });
      assert.strictEqual(res.status, 400, `Unsupported language '${inv}' must return 400`);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.error.includes("Unsupported"));
    }
    console.log("  PASSED: Unsupported language codes strictly rejected with 400.\n");

    // -------------------------------------------------------------
    // TEST 4: Missing or Empty Text Rejected with 400 Bad Request
    // -------------------------------------------------------------
    console.log("[Test 4] Missing or empty text field is rejected with HTTP 400");
    const emptyPayloads = [
      {},
      { text: "" },
      { text: "   " },
      { text: null },
      { target_language: "ta" }
    ];
    for (const p of emptyPayloads) {
      const res = await fetch(`${BASE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p)
      });
      assert.strictEqual(res.status, 400, "Empty or missing text must return 400");
      const data = await res.json();
      assert.strictEqual(data.success, false);
    }
    console.log("  PASSED: Empty or missing text rejected cleanly.\n");

    // -------------------------------------------------------------
    // TEST 5: Missing target_language Rejected with 400 Bad Request
    // -------------------------------------------------------------
    console.log("[Test 5] Missing target_language is rejected with HTTP 400");
    const noLangRes = await fetch(`${BASE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello world" })
    });
    assert.strictEqual(noLangRes.status, 400);
    const noLangData = await noLangRes.json();
    assert.strictEqual(noLangData.success, false);
    assert.ok(noLangData.error.includes("target_language"));
    console.log("  PASSED: Missing target_language rejected with 400.\n");

    // -------------------------------------------------------------
    // TEST 6: Text Length Limit Exceeded (>10,000 chars) Rejected with 400
    // -------------------------------------------------------------
    console.log("[Test 6] Text exceeding 10,000 characters is rejected with HTTP 400");
    const hugeText = "A".repeat(10001);
    const hugeRes = await fetch(`${BASE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: hugeText, target_language: "ta" })
    });
    assert.strictEqual(hugeRes.status, 400);
    const hugeData = await hugeRes.json();
    assert.strictEqual(hugeData.success, false);
    assert.ok(hugeData.error.includes("maximum allowed length"));
    console.log("  PASSED: Excessive payload rejected before reaching AI service.\n");

    // -------------------------------------------------------------
    // TEST 7: Summary Translation via POST /api/summaries/:id/translate (All 7 Languages)
    // -------------------------------------------------------------
    console.log("[Test 7] Summary translation endpoint accepts all 7 languages without login");
    // Seed test book & summary
    const testBook = await Book.create({
      id: "book-verify-phys",
      user_id: "default-student-public",
      file_url: "/uploads/phys.pdf",
      title: "General Physics",
      subject: "Physics",
      extracted_text: "Relativity E = mc^2."
    });

    const testSummary = await Summary.create({
      id: "sum-verify-phys",
      book_id: testBook.id,
      user_id: "default-student-public",
      summary_text: "Einstein discovered mass-energy equivalence: E = mc^2. Energy is proportional to mass.",
      key_concepts: JSON.stringify(["Mass-Energy Equivalence", "Speed of Light Constant"]),
      exam_questions: JSON.stringify([]),
      quick_revision: JSON.stringify({
        revisionPoints: ["E = mc^2 is the mass-energy relationship."],
        formulas: [{ name: "Mass-Energy", formula: "E = mc^2", description: "Energy equals mass times c squared" }]
      }),
      definitions: JSON.stringify([{ term: "Mass-Energy", meaning: "Equivalence of mass and energy" }]),
      language: "en"
    });

    for (const code of supportedCodes) {
      const sumTransRes = await fetch(`${BASE_URL}/summaries/${testSummary.id}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_language: code })
      });
      assert.strictEqual(sumTransRes.status, 200, `Summary translation for '${code}' must return 200`);
      const sumTransData = await sumTransRes.json();
      assert.strictEqual(sumTransData.success, true);
      assert.strictEqual(sumTransData.language, code);
      assert.ok(sumTransData.translation);
      assert.ok(sumTransData.translation.summaryText);
      assert.ok(Array.isArray(sumTransData.translation.keyPoints));
    }
    console.log("  PASSED: Summary translation for all 7 languages verified.\n");

    // -------------------------------------------------------------
    // TEST 8: Client-Provided Summary Fallback (Non-Persisted / Demo Summary)
    // -------------------------------------------------------------
    console.log("[Test 8] Client-provided summary payload translated when ID not in SQLite");
    const demoPayload = {
      id: "sum-demo-virtual",
      summaryText: "Database indexes use B-Tree structures to speed up retrieval operations.",
      keyPoints: ["B-Trees maintain sorted data", "Indexes reduce disk I/O"],
      formulas: [{ name: "Search Cost", formula: "O(log N)", description: "Logarithmic lookup" }],
      definitions: [{ term: "B-Tree", meaning: "Self-balancing search tree" }]
    };

    const clientSumRes = await fetch(`${BASE_URL}/summaries/sum-demo-virtual/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_language: "ta",
        summary: demoPayload
      })
    });
    assert.strictEqual(clientSumRes.status, 200);
    const clientSumData = await clientSumRes.json();
    assert.strictEqual(clientSumData.success, true);
    assert.strictEqual(clientSumData.language, "ta");
    assert.ok(clientSumData.translation.summaryText);
    console.log("  PASSED: Client-provided fallback summary translated seamlessly.\n");

    // -------------------------------------------------------------
    // TEST 9: Missing API Configuration in Production Mode Fails with 503
    // -------------------------------------------------------------
    console.log("[Test 9] Missing API key in production mode returns 503 Service Unavailable");
    const savedKey = env.GEMINI_API_KEY;
    const savedNodeEnv = env.NODE_ENV;
    try {
      env.GEMINI_API_KEY = "";
      env.NODE_ENV = "production";
      await TranslationService.translateText("Sample text to translate", "ta", "en");
      assert.fail("Should have thrown 503 error when API key is missing");
    } catch (err) {
      assert.strictEqual(err.statusCode, 503);
      assert.ok(err.message.includes("unavailable") || err.message.includes("GEMINI_API_KEY"));
    } finally {
      env.GEMINI_API_KEY = savedKey;
      env.NODE_ENV = savedNodeEnv;
    }
    console.log("  PASSED: Missing API key fails cleanly with HTTP 503 without crashing.\n");

    // -------------------------------------------------------------
    // TEST 10: Secret Leakage Prevention
    // -------------------------------------------------------------
    console.log("[Test 10] No API keys, credentials, or secrets exposed in translation payloads");
    const resCheck = await fetch(`${BASE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Checking for secret leaks", target_language: "hi" })
    });
    const checkBody = await resCheck.text();
    assert.strictEqual(checkBody.includes("AIzaSy"), false, "Must NOT contain Gemini API key");
    assert.strictEqual(checkBody.includes("GOOGLE_TRANSLATE_API_KEY"), false, "Must NOT contain Google Translate key");
    assert.strictEqual(checkBody.includes("JWT_SECRET"), false, "Must NOT contain JWT secret");
      // -------------------------------------------------------------
    // TEST 11: Valid Gemini Fallback Model IDs for Configured Endpoint
    // -------------------------------------------------------------
    console.log("[Test 11] Fallback model IDs are valid for Google Generative Language API endpoint");
    assert.strictEqual(
      aiConfig.gemini.endpoint,
      "https://generativelanguage.googleapis.com/v1beta/models",
      "Endpoint must point to Google Generative Language v1beta models"
    );
    const validGeminiModels = [
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash"
    ];
    assert.ok(
      validGeminiModels.includes(env.GEMINI_MODEL),
      `Configured default GEMINI_MODEL '${env.GEMINI_MODEL}' must be a valid Gemini model`
    );
    console.log("  PASSED: Configured Gemini model and endpoint verified.\n");

    // -------------------------------------------------------------
    // TEST 12: Unsupported-Model Caching & Temporary Failure Safety
    // -------------------------------------------------------------
    console.log("[Test 12] Unsupported-model caching avoids repeated 404s and handles transient errors safely");
    const originalFetch = global.fetch;
    const originalKey = env.GEMINI_API_KEY;
    const originalModel = env.GEMINI_MODEL;
    AiSummaryService.resetModelCache();

    try {
      env.GEMINI_API_KEY = "test-verification-api-key";
      env.GEMINI_MODEL = "gemini-simulated-unsupported-model";

      let simulated404Calls = 0;
      let workingModelCalls = 0;

      global.fetch = async (url, opts) => {
        if (url.includes("gemini-simulated-unsupported-model")) {
          simulated404Calls++;
          return {
            status: 404,
            ok: false,
            text: async () => "models/gemini-simulated-unsupported-model is not found or not supported"
          };
        }
        if (url.includes("gemini-3.5-flash-lite")) {
          workingModelCalls++;
          return {
            status: 200,
            ok: true,
            json: async () => ({
              candidates: [{ content: { parts: [{ text: "Mocked translation response" }] } }]
            })
          };
        }
        return originalFetch(url, opts);
      };

      // Call 1: Should encounter 404 on unsupported model, cache it, fall back to gemini-3.5-flash-lite
      const call1Result = await AiSummaryService.callGeminiApiWithRetry("Translate test chunk");
      assert.strictEqual(call1Result, "Mocked translation response");
      assert.strictEqual(simulated404Calls, 1, "Should have received 404 exactly once on model discovery");
      assert.strictEqual(workingModelCalls, 1, "Should have succeeded on fallback model");
      assert.ok(
        AiSummaryService.getUnsupportedModels().includes("gemini-simulated-unsupported-model"),
        "Unsupported model must be cached in unsupportedModels set"
      );
      assert.strictEqual(
        AiSummaryService.getActiveWorkingModel(),
        "gemini-3.5-flash-lite",
        "Active working model must be cached as gemini-3.5-flash-lite"
      );

      // Call 2: Must directly call activeWorkingModel and NOT re-query unsupported model (zero repeated 404s)
      const call2Result = await AiSummaryService.callGeminiApiWithRetry("Translate second test chunk");
      assert.strictEqual(call2Result, "Mocked translation response");
      assert.strictEqual(simulated404Calls, 1, "Must NOT repeat 404 request to known unsupported model");
      assert.strictEqual(workingModelCalls, 2, "Active working model served the second request directly");

      // Verify transient failure (429 / 503) does NOT mark model as unsupported
      let transient503Called = 0;
      global.fetch = async (url, opts) => {
        if (url.includes("gemini-3.5-flash-lite")) {
          transient503Called++;
          return {
            status: 503,
            ok: false,
            text: async () => "Temporary upstream capacity overload"
          };
        }
        return originalFetch(url, opts);
      };

      try {
        await AiSummaryService.callGeminiApiWithRetry("Translate transient error", { maxRetries: 2, initialDelayMs: 10 });
        assert.fail("Should throw on persistent transient error");
      } catch (err) {
        assert.strictEqual(err.statusCode, 503);
      }
      assert.strictEqual(
        AiSummaryService.getUnsupportedModels().includes("gemini-3.5-flash-lite"),
        false,
        "Temporary 503 failure must NOT cache valid model as unsupported"
      );
    } finally {
      global.fetch = originalFetch;
      env.GEMINI_API_KEY = originalKey;
      env.GEMINI_MODEL = originalModel;
      AiSummaryService.resetModelCache();
    }
    console.log("  PASSED: 404 caching verified with zero repeated 404s and safe transient failure handling.\n");

    console.log("🎉 ALL 12 TRANSLATION VERIFICATION TESTS PASSED!\n");
  } finally {
    if (server) {
      server.close();
      console.log(" Test server closed.");
    }
  }
};

runVerification().catch((err) => {
  console.error("❌ Translation Verification Test Failed:", err);
  if (server) server.close();
  process.exit(1);
});
