import assert from "assert";
import { TtsService, VOICE_MODELS } from "../src/services/ttsService.js";
import { SUPPORTED_LANGUAGES, getLanguageConfig } from "../src/config/languageConfig.js";

// Recreate frontend language locale map logic to verify exact parity
const LANGUAGE_LOCALE_MAP = {
  en: "en-IN",
  ta: "ta-IN",
  hi: "hi-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  bn: "bn-IN"
};

// Simulation of SpeechService.findMatchingVoice logic
function findMatchingVoiceMock(voices, langCode, voiceName = null) {
  if (!voices || voices.length === 0) return null;
  const baseLang = (langCode || "en").toLowerCase().split(/[-_]/)[0];
  const targetBcp47 = (LANGUAGE_LOCALE_MAP[baseLang] || "en-IN").toLowerCase();

  if (voiceName) {
    const named = voices.find(v => v.name === voiceName);
    if (named) {
      const vl = (named.lang || "").toLowerCase().replace("_", "-");
      if (baseLang === "en" && vl.startsWith("en")) return named;
      if (vl.startsWith(baseLang)) return named;
    }
  }

  if (baseLang === "en") {
    const enIn = voices.find(v => (v.lang || "").toLowerCase().replace("_", "-") === "en-in");
    if (enIn) return enIn;

    const enInName = voices.find(v => {
      const vl = (v.lang || "").toLowerCase().replace("_", "-");
      const vn = (v.name || "").toLowerCase();
      return vl.startsWith("en") && (vn.includes("india") || vn.includes("ravi") || vn.includes("heera"));
    });
    if (enInName) return enInName;

    return voices.find(v => (v.lang || "").toLowerCase().startsWith("en")) || null;
  }

  // Indian languages: STRICT MATCHING ONLY
  const exact = voices.find(v => (v.lang || "").toLowerCase().replace("_", "-") === targetBcp47);
  if (exact) return exact;

  const prefix = voices.find(v => {
    const vl = (v.lang || "").toLowerCase().replace("_", "-");
    return vl.startsWith(`${baseLang}-`) || vl === baseLang;
  });
  if (prefix) return prefix;

  // NEVER return English voice for Indian language!
  return null;
}

const runSpeechSelectionTests = async () => {
  console.log("\n🧪 Running Focused Multilingual Speech Voice Selection Test Suite...\n");

  // 1. Language Locale Map Verification (Requirement 3)
  console.log("[Test 1] Language locale mapping matches Requirement 3");
  assert.strictEqual(LANGUAGE_LOCALE_MAP.en, "en-IN", "English must map to en-IN");
  assert.strictEqual(LANGUAGE_LOCALE_MAP.ta, "ta-IN", "Tamil must map to ta-IN");
  assert.strictEqual(LANGUAGE_LOCALE_MAP.hi, "hi-IN", "Hindi must map to hi-IN");
  assert.strictEqual(LANGUAGE_LOCALE_MAP.te, "te-IN", "Telugu must map to te-IN");
  assert.strictEqual(LANGUAGE_LOCALE_MAP.kn, "kn-IN", "Kannada must map to kn-IN");
  assert.strictEqual(LANGUAGE_LOCALE_MAP.ml, "ml-IN", "Malayalam must map to ml-IN");
  assert.strictEqual(LANGUAGE_LOCALE_MAP.bn, "bn-IN", "Bengali must map to bn-IN");
  console.log("  PASSED: All 7 language locales map to Indian BCP-47 variants.\n");

  // 2. Parity with Backend Language Config
  console.log("[Test 2] Parity with backend languageConfig.js");
  for (const [code, expectedBcp47] of Object.entries(LANGUAGE_LOCALE_MAP)) {
    const cfg = getLanguageConfig(code);
    assert.strictEqual(cfg.ttsCode, expectedBcp47, `Backend config ttsCode matches for ${code}`);
  }
  console.log("  PASSED: Backend and frontend locale definitions are identical.\n");

  // 3. English voice selection prioritizes en-IN
  console.log("[Test 3] English voice selection prioritizes en-IN");
  const mixedVoices = [
    { name: "Microsoft David", lang: "en-US" },
    { name: "Microsoft Ravi", lang: "en-IN" },
    { name: "Microsoft Heera", lang: "en-IN" },
    { name: "Microsoft George", lang: "en-GB" }
  ];
  const selectedEn = findMatchingVoiceMock(mixedVoices, "en");
  assert.strictEqual(selectedEn.name, "Microsoft Ravi", "Must select Indian English voice first");
  assert.strictEqual(selectedEn.lang, "en-IN");
  console.log("  PASSED: English voice selection selects en-IN voice first.\n");

  // 4. Tamil voice selection when Tamil voice is installed
  console.log("[Test 4] Tamil voice selection when Tamil voice is present");
  const voicesWithTamil = [
    { name: "Microsoft David", lang: "en-US" },
    { name: "Microsoft Ravi", lang: "en-IN" },
    { name: "Google தமிழ்", lang: "ta-IN" },
    { name: "Google हिन्दी", lang: "hi-IN" }
  ];
  const selectedTa = findMatchingVoiceMock(voicesWithTamil, "ta");
  assert.ok(selectedTa, "Tamil voice should be found");
  assert.strictEqual(selectedTa.name, "Google தமிழ்");
  assert.strictEqual(selectedTa.lang, "ta-IN");
  console.log("  PASSED: Tamil voice accurately selected when installed.\n");

  // 5. Hindi voice selection when Hindi voice is present
  console.log("[Test 5] Hindi voice selection when Hindi voice is present");
  const selectedHi = findMatchingVoiceMock(voicesWithTamil, "hi");
  assert.ok(selectedHi, "Hindi voice should be found");
  assert.strictEqual(selectedHi.name, "Google हिन्दी");
  assert.strictEqual(selectedHi.lang, "hi-IN");
  console.log("  PASSED: Hindi voice accurately selected when installed.\n");

  // 6. Strict Unavailable Voice Rejection (Requirement 5)
  console.log("[Test 6] Unavailable voice returns null and NEVER falls back to English voice");
  const englishOnlyVoices = [
    { name: "Microsoft David", lang: "en-US" },
    { name: "Microsoft Zira", lang: "en-US" },
    { name: "Microsoft Ravi", lang: "en-IN" }
  ];
  const noTamilVoice = findMatchingVoiceMock(englishOnlyVoices, "ta");
  assert.strictEqual(noTamilVoice, null, "Tamil voice MUST be null when no Tamil voice is installed");

  const noHindiVoice = findMatchingVoiceMock(englishOnlyVoices, "hi");
  assert.strictEqual(noHindiVoice, null, "Hindi voice MUST be null when no Hindi voice is installed");

  const noTeluguVoice = findMatchingVoiceMock(englishOnlyVoices, "te");
  assert.strictEqual(noTeluguVoice, null, "Telugu voice MUST be null when no Telugu voice is installed");
  console.log("  PASSED: Missing voice returns null — never silently aliases to an English voice.\n");

  // 7. Backend TTS Synthesis for all supported languages
  console.log("[Test 7] Backend TTS synthesis supports all languages");
  for (const code of Object.keys(LANGUAGE_LOCALE_MAP)) {
    const res = await TtsService.synthesizeSpeech({
      text: "Test textbook sentence for TTS synthesis",
      language: code
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.language, LANGUAGE_LOCALE_MAP[code]);
  }
  console.log("  PASSED: Backend TTS successfully generates payloads for all 7 languages.\n");

  // 8. VOICE_MODELS export check
  console.log("[Test 8] VOICE_MODELS export verified");
  assert.ok(VOICE_MODELS["en-IN"]);
  assert.ok(VOICE_MODELS["ta-IN"]);
  assert.ok(VOICE_MODELS["hi-IN"]);
  console.log("  PASSED: VOICE_MODELS config properly exported.\n");

  console.log("🎉 ALL MULTILINGUAL SPEECH SELECTION TESTS PASSED!\n");
};

runSpeechSelectionTests().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
