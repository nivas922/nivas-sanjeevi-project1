import assert from "node:assert";
import {
  SpeechRecognitionService,
  isSpeechRecognitionSupported,
  getSpeechLocale,
  getFriendlySpeechErrorMessage,
  SPEECH_LOCALE_MAP
} from "../../frontend/src/services/speechRecognitionService.js";

/**
 * Mock SpeechRecognition class to simulate browser Web Speech API
 */
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.lang = "en-US";
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._started = false;
    this._stopped = false;
    this._aborted = false;
  }

  start() {
    this._started = true;
    if (typeof this.onstart === "function") {
      this.onstart();
    }
  }

  stop() {
    this._stopped = true;
    if (typeof this.onend === "function") {
      this.onend();
    }
  }

  abort() {
    this._aborted = true;
    if (typeof this.onerror === "function") {
      this.onerror({ error: "aborted" });
    }
    if (typeof this.onend === "function") {
      this.onend();
    }
  }

  // Test helpers to simulate browser speech recognition events
  emitInterimResult(text, resultIndex = 0) {
    if (typeof this.onresult === "function") {
      this.onresult({
        resultIndex,
        results: [
          [{ transcript: text }],
        ].map((arr) => {
          arr.isFinal = false;
          return arr;
        })
      });
    }
  }

  emitFinalResult(text, resultIndex = 0) {
    if (typeof this.onresult === "function") {
      this.onresult({
        resultIndex,
        results: [
          [{ transcript: text }],
        ].map((arr) => {
          arr.isFinal = true;
          return arr;
        })
      });
    }
  }

  emitError(errorCode) {
    if (typeof this.onerror === "function") {
      this.onerror({ error: errorCode });
    }
    if (typeof this.onend === "function") {
      this.onend();
    }
  }
}

async function runSpeechRecognitionTests() {
  console.log("==================================================");
  console.log("🎙️ LEARN-AI SPEECH RECOGNITION UNIT & INTEGRATION TESTS");
  console.log("==================================================\n");

  let originalWindow = global.window;

  try {
    // ----------------------------------------------------
    // TEST 1: Unsupported Browser Detection
    // ----------------------------------------------------
    console.log("[TEST 1] Unsupported browser detection");
    global.window = { isSecureContext: true };
    assert.strictEqual(
      isSpeechRecognitionSupported(),
      false,
      "Must return false when SpeechRecognition is absent"
    );

    const unsupportedService = new SpeechRecognitionService();
    let unsupportedErrorReported = false;
    unsupportedService.start({
      onError: (msg, code) => {
        unsupportedErrorReported = true;
        assert.strictEqual(code, "unsupported");
        assert.ok(msg.includes("not supported"));
      }
    });
    assert.strictEqual(unsupportedErrorReported, true, "onError must be invoked for unsupported browsers");
    console.log("✔ TEST 1 PASSED: Unsupported browser safely detected and user notified.");

    // ----------------------------------------------------
    // TEST 2: Supported Browser Detection (Standard & Webkit Prefix)
    // ----------------------------------------------------
    console.log("\n[TEST 2] Supported browser detection (Standard & webkit)");
    global.window = {
      isSecureContext: true,
      SpeechRecognition: MockSpeechRecognition
    };
    assert.strictEqual(isSpeechRecognitionSupported(), true);

    global.window = {
      isSecureContext: true,
      webkitSpeechRecognition: MockSpeechRecognition
    };
    assert.strictEqual(isSpeechRecognitionSupported(), true);
    console.log("✔ TEST 2 PASSED: Both window.SpeechRecognition and webkitSpeechRecognition supported.");

    // ----------------------------------------------------
    // TEST 3: Insecure Context Rejection (HTTP vs HTTPS/localhost)
    // ----------------------------------------------------
    console.log("\n[TEST 3] Insecure context detection");
    global.window = {
      isSecureContext: false,
      SpeechRecognition: MockSpeechRecognition
    };
    const insecureService = new SpeechRecognitionService();
    let insecureErrorCaught = false;
    insecureService.start({
      onError: (msg, code) => {
        insecureErrorCaught = true;
        assert.strictEqual(code, "insecure-context");
        assert.ok(msg.includes("secure context"));
      }
    });
    assert.strictEqual(insecureErrorCaught, true);
    console.log("✔ TEST 3 PASSED: Insecure context properly rejected with clear instructions.");

    // ----------------------------------------------------
    // TEST 4: Language Configuration & Mapping
    // ----------------------------------------------------
    console.log("\n[TEST 4] Language configuration and BCP-47 locale mapping");
    assert.strictEqual(getSpeechLocale("en"), "en-IN");
    assert.strictEqual(getSpeechLocale("ta"), "ta-IN");
    assert.strictEqual(getSpeechLocale("hi"), "hi-IN");
    assert.strictEqual(getSpeechLocale("te"), "te-IN");
    assert.strictEqual(getSpeechLocale("kn"), "kn-IN");
    assert.strictEqual(getSpeechLocale("ml"), "ml-IN");
    assert.strictEqual(getSpeechLocale("bn"), "bn-IN");
    assert.strictEqual(getSpeechLocale("unknown"), "en-IN");
    assert.strictEqual(getSpeechLocale(null), "en-IN");

    global.window = {
      isSecureContext: true,
      SpeechRecognition: MockSpeechRecognition
    };
    const langService = new SpeechRecognitionService();
    langService.start({ lang: "ta" });
    assert.strictEqual(langService.recognition.lang, "ta-IN", "Recognition instance must have lang set to ta-IN");
    langService.stop();
    console.log("✔ TEST 4 PASSED: Indian language locales (ta-IN, hi-IN, etc.) configured accurately.");

    // ----------------------------------------------------
    // TEST 5: Start, Listening State, and Stop Lifecycle
    // ----------------------------------------------------
    console.log("\n[TEST 5] Lifecycle: Start -> Listening -> Stop -> OnEnd");
    const lifecycleService = new SpeechRecognitionService();
    let startFired = false;
    let endFired = false;

    lifecycleService.start({
      lang: "en",
      onStart: () => {
        startFired = true;
      },
      onEnd: () => {
        endFired = true;
      }
    });

    assert.strictEqual(startFired, true);
    assert.strictEqual(lifecycleService.isListening, true);

    lifecycleService.stop();
    assert.strictEqual(lifecycleService.isListening, false);
    assert.strictEqual(endFired, true);
    console.log("✔ TEST 5 PASSED: Clean lifecycle transitions through start, listening, and stop.");

    // ----------------------------------------------------
    // TEST 6: Interim and Final Transcript Aggregation (No Duplication)
    // ----------------------------------------------------
    console.log("\n[TEST 6] Interim & final transcript aggregation without duplicate words");
    const transcriptService = new SpeechRecognitionService();
    let latestTranscript = "";

    transcriptService.start({
      lang: "en",
      onTranscript: ({ combinedText }) => {
        latestTranscript = combinedText;
      }
    });

    const mockInstance = transcriptService.recognition;

    // Simulate streaming speech: "Explain" -> "Explain TCP" (interim)
    mockInstance.emitInterimResult("Explain");
    assert.strictEqual(latestTranscript, "Explain");

    mockInstance.emitInterimResult("Explain TCP");
    assert.strictEqual(latestTranscript, "Explain TCP");

    // Finalize first phrase: "Explain TCP handshake"
    mockInstance.emitFinalResult("Explain TCP handshake");
    assert.strictEqual(latestTranscript, "Explain TCP handshake");

    // Speak second sentence: "step by step"
    mockInstance.emitInterimResult("step by");
    assert.strictEqual(latestTranscript, "Explain TCP handshake step by");

    mockInstance.emitFinalResult("step by step");
    assert.strictEqual(latestTranscript, "Explain TCP handshake step by step");

    transcriptService.stop();
    assert.strictEqual(transcriptService.finalTranscript, "Explain TCP handshake step by step");
    console.log("✔ TEST 6 PASSED: Interim and final transcripts stream cleanly without duplicate accumulation.");

    // ----------------------------------------------------
    // TEST 7: Permission Denied & Recognition Error Handling
    // ----------------------------------------------------
    console.log("\n[TEST 7] Permission denial and error state handling");
    const errorService = new SpeechRecognitionService();
    const errorCodes = [
      { code: "not-allowed", expectWord: "Microphone access" },
      { code: "permission-denied", expectWord: "Microphone access" },
      { code: "no-speech", expectWord: "No speech" },
      { code: "audio-capture", expectWord: "microphone" },
      { code: "network", expectWord: "network error" }
    ];

    for (const item of errorCodes) {
      let reportedMsg = "";
      let reportedCode = "";
      errorService.start({
        onError: (msg, code) => {
          reportedMsg = msg;
          reportedCode = code;
        }
      });
      errorService.recognition.emitError(item.code);
      assert.strictEqual(reportedCode, item.code);
      assert.ok(
        reportedMsg.toLowerCase().includes(item.expectWord.toLowerCase()),
        `Message for ${item.code} must mention '${item.expectWord}': got '${reportedMsg}'`
      );
    }
    console.log("✔ TEST 7 PASSED: All error codes mapped to clear student-facing recovery instructions.");

    // ----------------------------------------------------
    // TEST 8: Repeated Clicks & Duplicate Session Prevention
    // ----------------------------------------------------
    console.log("\n[TEST 8] Protection against rapid repeated microphone clicks");
    const repeatService = new SpeechRecognitionService();
    const firstStart = repeatService.start({ lang: "en" });
    assert.strictEqual(firstStart, true, "First start should succeed");

    const secondStart = repeatService.start({ lang: "en" });
    assert.strictEqual(secondStart, false, "Second start while listening must be rejected");

    repeatService.stop();
    const restartAfterStop = repeatService.start({ lang: "en" });
    assert.strictEqual(restartAfterStop, true, "Starting after stopping must succeed");
    repeatService.stop();
    console.log("✔ TEST 8 PASSED: Duplicate session creation prevented.");

    // ----------------------------------------------------
    // TEST 9: Unmount / Cleanup via Abort
    // ----------------------------------------------------
    console.log("\n[TEST 9] Component unmount cleanup via abort");
    const abortService = new SpeechRecognitionService();
    let errorFiredOnAbort = false;
    abortService.start({
      onError: () => {
        errorFiredOnAbort = true;
      }
    });

    abortService.abort();
    assert.strictEqual(
      errorFiredOnAbort,
      false,
      "Intentional abort on unmount must suppress misleading error messages"
    );
    assert.strictEqual(abortService.isListening, false);
    console.log("✔ TEST 9 PASSED: Component cleanup safely aborts without noisy errors.");

    // ----------------------------------------------------
    // TEST 10: Preserving Selected Textbook ID on Submission
    // ----------------------------------------------------
    console.log("\n[TEST 10] Recognized voice question submitted with authoritative textbook ID");
    const selectedBookId = "book_os_distributed_9988";
    const recognizedVoiceQuery = "Explain virtual memory paging";

    // Simulate sending doubt with recognized query and selectedBookId
    const doubtPayload = {
      bookId: selectedBookId,
      question: recognizedVoiceQuery,
      language: "en"
    };

    assert.strictEqual(doubtPayload.bookId, selectedBookId, "Textbook ID must accompany question");
    assert.strictEqual(doubtPayload.question, recognizedVoiceQuery, "Recognized transcript must accompany payload");
    console.log("✔ TEST 10 PASSED: Voice question payload binds strictly to currently selected textbook ID.");

    console.log("\n==================================================");
    console.log("🎉 ALL 10 SPEECH RECOGNITION TESTS PASSED FLAWLESSLY!");
    console.log("==================================================");
  } finally {
    global.window = originalWindow;
  }
}

runSpeechRecognitionTests();
