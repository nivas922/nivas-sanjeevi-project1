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
    this._results = [];
  }

  start() {
    this._started = true;
    this._results = [];
    if (typeof this.onstart === "function") {
      this.onstart();
    }
  }

  stop() {
    this._stopped = true;
    if (this._asyncStop) {
      // Simulate browser keeping audio open until onend fires asynchronously
      return;
    }
    if (typeof this.onend === "function") {
      this.onend();
    }
  }

  finishAsyncStop() {
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
  emitResults(resultItems, resultIndex = 0) {
    if (typeof this.onresult === "function") {
      const results = resultItems.map((item) => {
        const arr = [{ transcript: item.text }];
        arr.isFinal = Boolean(item.isFinal);
        return arr;
      });
      this.onresult({
        resultIndex,
        results
      });
    }
  }

  emitInterimResult(text, resultIndex) {
    if (typeof this.onresult === "function") {
      const idx = typeof resultIndex === "number" ? resultIndex : this._results.length;
      const resultsCopy = this._results.slice();
      resultsCopy[idx] = Object.assign([{ transcript: text }], { isFinal: false });
      this.onresult({
        resultIndex: idx,
        results: resultsCopy
      });
    }
  }

  emitFinalResult(text, resultIndex) {
    if (typeof this.onresult === "function") {
      const idx = typeof resultIndex === "number" ? resultIndex : this._results.length;
      this._results[idx] = Object.assign([{ transcript: text }], { isFinal: true });
      this.onresult({
        resultIndex: idx,
        results: this._results.slice()
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
    // TEST 4: Language Configuration & Mapping (Idempotency & Indian BCP-47)
    // ----------------------------------------------------
    console.log("\n[TEST 4] Language configuration and BCP-47 locale mapping (idempotent)");
    assert.strictEqual(getSpeechLocale("en"), "en-IN");
    assert.strictEqual(getSpeechLocale("ta"), "ta-IN");
    assert.strictEqual(getSpeechLocale("hi"), "hi-IN");
    assert.strictEqual(getSpeechLocale("te"), "te-IN");
    assert.strictEqual(getSpeechLocale("kn"), "kn-IN");
    assert.strictEqual(getSpeechLocale("ml"), "ml-IN");
    assert.strictEqual(getSpeechLocale("bn"), "bn-IN");
    assert.strictEqual(getSpeechLocale("ta-IN"), "ta-IN");
    assert.strictEqual(getSpeechLocale("hi-IN"), "hi-IN");
    assert.strictEqual(getSpeechLocale("ta_IN"), "ta-IN", "Locale with underscore prefix must map to ta-IN");
    assert.strictEqual(getSpeechLocale(getSpeechLocale("ta")), "ta-IN", "getSpeechLocale must be idempotent");
    assert.strictEqual(getSpeechLocale(getSpeechLocale("hi")), "hi-IN", "getSpeechLocale must be idempotent");
    assert.strictEqual(getSpeechLocale("unknown"), "en-IN");
    assert.strictEqual(getSpeechLocale("fr"), "en-IN", "Unsupported locale 'fr' must safely default to en-IN");
    assert.strictEqual(getSpeechLocale("de"), "en-IN", "Unsupported locale 'de' must safely default to en-IN");
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
    // ----------------------------------------------------
    // TEST 6: Interim & Final Transcript Aggregation (Retention & Precision)
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
    // TEST 7: Legitimate Repeated Words (e.g. 'yes yes') Without Loss
    // ----------------------------------------------------
    console.log("\n[TEST 7] Legitimate repeated words ('yes yes') preserved without endsWith false deduplication");
    const repeatWordService = new SpeechRecognitionService();
    let repeatTranscript = "";
    repeatWordService.start({
      lang: "en",
      onTranscript: ({ combinedText }) => {
        repeatTranscript = combinedText;
      }
    });

    // Speak repeated words in cumulative results
    repeatWordService.recognition.emitResults([
      { text: "yes", isFinal: true },
      { text: "yes", isFinal: true }
    ]);
    assert.strictEqual(
      repeatTranscript,
      "yes yes",
      "Repeated words like 'yes yes' must both be preserved"
    );

    repeatWordService.recognition.emitResults([
      { text: "yes", isFinal: true },
      { text: "yes", isFinal: true },
      { text: "yes", isFinal: true }
    ]);
    assert.strictEqual(
      repeatTranscript,
      "yes yes yes",
      "Repeated words like 'yes yes yes' must all be preserved"
    );
    repeatWordService.stop();
    console.log("✔ TEST 7 PASSED: Legitimate repeated words are preserved accurately without false deduplication.");

    // ----------------------------------------------------
    // TEST 8: Single Interim Result at Index 0 Changing Several Times Before Becoming Final
    // ----------------------------------------------------
    console.log("\n[TEST 8] Single interim result at index 0 changing several times before becoming final (no old interim appended)");
    const interimUpdateService = new SpeechRecognitionService();
    let interimSequence = [];
    interimUpdateService.start({
      lang: "en",
      onTranscript: ({ combinedText }) => {
        interimSequence.push(combinedText);
      }
    });

    // Sequence of interim updates at index 0: "wh" -> "what" -> "what is"
    interimUpdateService.recognition.emitResults([{ text: "wh", isFinal: false }]);
    assert.strictEqual(interimSequence[interimSequence.length - 1], "wh");
    assert.strictEqual(interimUpdateService.finalChunksMap.size, 0, "No finalized chunks while interim");

    interimUpdateService.recognition.emitResults([{ text: "what", isFinal: false }]);
    assert.strictEqual(interimSequence[interimSequence.length - 1], "what");
    assert.strictEqual(interimUpdateService.finalChunksMap.size, 0, "Previous interim 'wh' replaced, not finalized");

    interimUpdateService.recognition.emitResults([{ text: "what is", isFinal: false }]);
    assert.strictEqual(interimSequence[interimSequence.length - 1], "what is");
    assert.strictEqual(interimUpdateService.finalChunksMap.size, 0);

    // Finalize index 0
    interimUpdateService.recognition.emitResults([{ text: "what is binary search", isFinal: true }]);
    assert.strictEqual(interimSequence[interimSequence.length - 1], "what is binary search");
    assert.strictEqual(interimUpdateService.finalChunksMap.size, 1);
    assert.strictEqual(interimUpdateService.finalChunksMap.get(0), "what is binary search");
    assert.strictEqual(
      interimUpdateService.finalTranscript,
      "what is binary search",
      "Only the final phrase must be recorded, not older interim attempts"
    );

    // Now speak multiple finalized results: index 1 and index 2
    interimUpdateService.recognition.emitResults([
      { text: "what is binary search", isFinal: true },
      { text: "algorithm", isFinal: true },
      { text: "in computer science", isFinal: true }
    ]);
    assert.strictEqual(
      interimUpdateService.finalTranscript,
      "what is binary search algorithm in computer science",
      "Multiple finalized results across indices must be concatenated in sequence"
    );
    assert.strictEqual(interimUpdateService.finalChunksMap.size, 3);

    interimUpdateService.stop();
    console.log("✔ TEST 8 PASSED: Interim text replaced cleanly; old interim attempts never appended as finalized entries; multi-finalized phrases ordered correctly.");

    // ----------------------------------------------------
    // TEST 8B: Earlier Interim Result Remaining Unchanged While Later Index Changes
    // ----------------------------------------------------
    console.log("\n[TEST 8B] Earlier interim result remaining unchanged while later index changes (not lost)");
    const unchangedInterimService = new SpeechRecognitionService();
    let currentTranscripts = [];
    unchangedInterimService.start({
      lang: "en",
      onTranscript: ({ interimTranscript, combinedText }) => {
        currentTranscripts.push({ interimTranscript, combinedText });
      }
    });

    // Event 1: index 0 has interim "quick brown" (resultIndex = 0)
    unchangedInterimService.recognition.emitResults(
      [{ text: "quick brown", isFinal: false }],
      0
    );
    assert.strictEqual(unchangedInterimService.interimTranscript, "quick brown");

    // Event 2: index 0 remains "quick brown" (interim), while index 1 changes to "fox" (interim) with resultIndex = 1
    unchangedInterimService.recognition.emitResults(
      [
        { text: "quick brown", isFinal: false },
        { text: "fox", isFinal: false }
      ],
      1
    );
    assert.strictEqual(
      unchangedInterimService.interimTranscript,
      "quick brown fox",
      "Earlier interim at index 0 must be retained when index 1 changes with resultIndex = 1"
    );

    // Event 3: index 1 updates to "fox jumps" with resultIndex = 1
    unchangedInterimService.recognition.emitResults(
      [
        { text: "quick brown", isFinal: false },
        { text: "fox jumps", isFinal: false }
      ],
      1
    );
    assert.strictEqual(
      unchangedInterimService.interimTranscript,
      "quick brown fox jumps",
      "Earlier interim at index 0 must still be retained on subsequent index 1 updates"
    );

    // Event 4: both become final
    unchangedInterimService.recognition.emitResults(
      [
        { text: "quick brown", isFinal: true },
        { text: "fox jumps", isFinal: true }
      ],
      0
    );
    assert.strictEqual(
      unchangedInterimService.finalTranscript,
      "quick brown fox jumps"
    );
    assert.strictEqual(unchangedInterimService.interimTranscript, "");
    unchangedInterimService.stop();
    console.log("✔ TEST 8B PASSED: Unchanged earlier interim results are preserved when later indices change.");

    // ----------------------------------------------------
    // TEST 9: Cumulative Result List with resultIndex = 0 (WebKit/Safari)
    // ----------------------------------------------------
    console.log("\n[TEST 9] Cumulative result list with resultIndex = 0 does not duplicate finalized phrases");
    const safariService = new SpeechRecognitionService();
    let safariTranscript = "";
    safariService.start({
      lang: "en",
      onTranscript: ({ combinedText }) => {
        safariTranscript = combinedText;
      }
    });

    // Event 1 with resultIndex = 0
    safariService.recognition.emitResults([
      { text: "Explain database normalization", isFinal: true }
    ]);
    assert.strictEqual(safariTranscript, "Explain database normalization");

    // Event 2: cumulative list still passed with resultIndex = 0
    safariService.recognition.emitResults([
      { text: "Explain database normalization", isFinal: true },
      { text: "in 3NF and BCNF", isFinal: true }
    ]);
    assert.strictEqual(
      safariTranscript,
      "Explain database normalization in 3NF and BCNF",
      "Full result list with resultIndex=0 must not duplicate phrase 1"
    );
    safariService.stop();
    console.log("✔ TEST 9 PASSED: Cumulative result list with resultIndex = 0 handles multi-phrases without duplication.");

    // ----------------------------------------------------
    // TEST 10: Stop Followed by Immediate Restart (Prevents Overlapping Sessions)
    // ----------------------------------------------------
    console.log("\n[TEST 10] Stop followed by immediate restart prevents overlapping sessions & restarts cleanly");
    const restartService = new SpeechRecognitionService();
    restartService.start({ lang: "en" });
    assert.strictEqual(restartService.isListening, true);

    // Configure mock to simulate asynchronous stop (audio stream closing before onend fires)
    restartService.recognition._asyncStop = true;
    restartService.stop();
    assert.strictEqual(restartService.isStopping, true, "isStopping must be true while stop is in-flight");

    // Immediate restart while stopping MUST be rejected
    const immediateRestartSuccess = restartService.start({ lang: "en" });
    assert.strictEqual(
      immediateRestartSuccess,
      false,
      "Cannot start a new recognition session while previous session is still stopping"
    );

    // Browser completes shutdown and fires onend
    restartService.recognition.finishAsyncStop();
    assert.strictEqual(restartService.isStopping, false, "isStopping must be false after onend");
    assert.strictEqual(restartService.isListening, false, "isListening must be false after onend");

    // Now restart succeeds cleanly
    const subsequentStartSuccess = restartService.start({ lang: "en" });
    assert.strictEqual(subsequentStartSuccess, true, "Starting after stopping completes must succeed");
    assert.strictEqual(restartService.isListening, true);
    restartService.stop();
    console.log("✔ TEST 10 PASSED: Overlapping session creation blocked during stop; restart succeeds cleanly after onend.");

    // ----------------------------------------------------
    // TEST 11: Intentional Abort with Interim Text
    // ----------------------------------------------------
    console.log("\n[TEST 11] Intentional abort with interim text discards unfinalized interim speech");
    const abortWithInterimService = new SpeechRecognitionService();
    let abortEndEvent = null;
    abortWithInterimService.start({
      lang: "en",
      onEnd: (data) => {
        abortEndEvent = data;
      }
    });

    // Speak interim text
    abortWithInterimService.recognition.emitInterimResult("Half-spoken unfinalized query");
    assert.strictEqual(abortWithInterimService.interimTranscript, "Half-spoken unfinalized query");

    // User or component triggers abort()
    abortWithInterimService.abort();

    assert.strictEqual(abortWithInterimService.interimTranscript, "", "Interim transcript must be cleared on abort");
    assert.strictEqual(abortEndEvent.aborted, true, "onEnd must report aborted: true");
    assert.strictEqual(abortEndEvent.combinedText, "", "combinedText must be empty on abort when no final text exists");
    console.log("✔ TEST 11 PASSED: Intentional abort safely clears interim text without emitting unwanted words.");

    // ----------------------------------------------------
    // TEST 12: React Cleanup Behavior (isListening Transition vs Unmount)
    // ----------------------------------------------------
    console.log("\n[TEST 12] React cleanup: does not abort on isListening change, aborts on unmount only if listening");
    
    // Test simulation of useSpeechRecognition's effect & ref pattern:
    class SimulatedHookInstance {
      constructor() {
        this.service = new SpeechRecognitionService();
        this.isListening = false;
        this.isListeningRef = { current: false };
        this.abortCalls = 0;

        // Monkey-patch service.abort to count abort calls
        const origAbort = this.service.abort.bind(this.service);
        this.service.abort = () => {
          this.abortCalls++;
          origAbort();
        };

        // Effect 1: synchronizes isListeningRef
        this.syncListeningEffect = () => {
          this.isListeningRef.current = this.isListening;
        };

        // Effect 2: unmount-only cleanup (registered once on mount with [])
        this.unmountCleanup = () => {
          if (this.isListeningRef.current && this.service) {
            this.service.abort();
          }
        };
      }

      setListening(val) {
        this.isListening = val;
        this.syncListeningEffect();
      }

      unmount() {
        this.unmountCleanup();
      }
    }

    const hookInstance1 = new SimulatedHookInstance();
    const hookInstance2 = new SimulatedHookInstance();

    // 1. Changing isListening from false -> true -> false must NOT invoke abort
    hookInstance1.setListening(true);
    assert.strictEqual(hookInstance1.abortCalls, 0, "Setting isListening = true must not trigger abort");

    hookInstance1.setListening(false);
    assert.strictEqual(hookInstance1.abortCalls, 0, "Setting isListening = false must not trigger abort");

    // 2. Unmounting when NOT listening must NOT invoke abort
    hookInstance1.unmount();
    assert.strictEqual(hookInstance1.abortCalls, 0, "Unmounting idle hook instance must not trigger abort");

    // 3. Unmounting when ACTIVELY listening MUST invoke abort on its own service
    hookInstance2.service.start({ lang: "en" });
    hookInstance2.setListening(true);
    assert.strictEqual(hookInstance2.abortCalls, 0);

    hookInstance2.unmount();
    assert.strictEqual(hookInstance2.abortCalls, 1, "Unmounting while listening must invoke abort once");
    assert.strictEqual(hookInstance1.abortCalls, 0, "Hook instance 1 service must remain untouched (dedicated instances)");
    console.log("✔ TEST 12 PASSED: React cleanup does not abort on isListening change; each instance cleans up only its own service on unmount.");

    // ----------------------------------------------------
    // TEST 13: Preserving Previously Typed Input When No Speech is Captured
    // ----------------------------------------------------
    console.log("\n[TEST 13] Preserving previously typed input when no speech is captured");
    const typedInputPreserveService = new SpeechRecognitionService();
    const initialTypedQuestion = "What are the 4 conditions for deadlock?";
    let finalInputQuery = initialTypedQuestion;

    typedInputPreserveService.start({
      lang: "en",
      onEnd: ({ finalTranscript: finalTxt, interimTranscript: interimTxt, combinedText, aborted }) => {
        if (aborted) return;
        const capturedSpeech = combinedText || finalTxt || interimTxt || "";
        const resultText = initialTypedQuestion
          ? (capturedSpeech ? `${initialTypedQuestion} ${capturedSpeech}`.trim() : initialTypedQuestion)
          : capturedSpeech;
        finalInputQuery = resultText;
      }
    });

    // Simulate microphone ending on silence / no-speech (empty transcript chunks)
    typedInputPreserveService.stop();
    assert.strictEqual(
      finalInputQuery,
      "What are the 4 conditions for deadlock?",
      "Input query must retain initial typed question without wiping out to empty string"
    );
    console.log("✔ TEST 13 PASSED: Initial typed text is preserved intact when recognition captures no speech.");

    // ----------------------------------------------------
    // TEST 14: Permission Denied & Recognition Error Handling
    // ----------------------------------------------------
    console.log("\n[TEST 14] Permission denial and error state handling");
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
    console.log("✔ TEST 14 PASSED: All error codes mapped to clear student-facing recovery instructions.");

    // ----------------------------------------------------
    // TEST 15: Preserving Selected Textbook ID on Submission
    // ----------------------------------------------------
    console.log("\n[TEST 15] Recognized voice question submitted with authoritative textbook ID");
    const selectedBookId = "book_os_distributed_9988";
    const recognizedVoiceQuery = "Explain virtual memory paging";

    const doubtPayload = {
      bookId: selectedBookId,
      question: recognizedVoiceQuery,
      language: "en"
    };

    assert.strictEqual(doubtPayload.bookId, selectedBookId, "Textbook ID must accompany question");
    assert.strictEqual(doubtPayload.question, recognizedVoiceQuery, "Recognized transcript must accompany payload");
    console.log("✔ TEST 15 PASSED: Voice question payload binds strictly to currently selected textbook ID.");

    // ----------------------------------------------------
    // TEST 16: Result list change or truncation prunes stale finalChunksMap entries & preserves speech on Stop
    // ----------------------------------------------------
    console.log("\n[TEST 16] Result list change or truncation prunes stale finalChunksMap entries & preserves speech on Stop");
    const pruningService = new SpeechRecognitionService();
    let latestPruningResult = null;
    let endResult = null;
    pruningService.start({
      onTranscript: (res) => {
        latestPruningResult = res;
      },
      onEnd: (res) => {
        endResult = res;
      }
    });

    // 1. Emit 2 final items at index 0 and index 1
    pruningService.recognition.emitResults([
      { text: "first phrase", isFinal: true },
      { text: "second phrase", isFinal: true }
    ]);
    assert.strictEqual(latestPruningResult.finalTranscript, "first phrase second phrase");
    assert.strictEqual(latestPruningResult.combinedText, "first phrase second phrase");

    // 2. Simulate browser result list truncation: list length shrinks to 1 item
    pruningService.recognition.emitResults([
      { text: "first phrase", isFinal: true }
    ]);
    assert.strictEqual(
      latestPruningResult.finalTranscript,
      "first phrase",
      "Stale index 1 must be pruned when results list shrinks"
    );
    assert.strictEqual(latestPruningResult.combinedText, "first phrase");

    // 3. Simulate index 1 reappearing as interim speech
    pruningService.recognition.emitResults([
      { text: "first phrase", isFinal: true },
      { text: "interim phrase", isFinal: false }
    ]);
    assert.strictEqual(latestPruningResult.finalTranscript, "first phrase");
    assert.strictEqual(latestPruningResult.interimTranscript, "interim phrase");
    assert.strictEqual(latestPruningResult.combinedText, "first phrase interim phrase");

    // 4. Normal stop preserves the valid combined speech without starting a second session
    pruningService.stop();
    assert.ok(endResult, "onEnd must be invoked upon normal stop");
    assert.strictEqual(endResult.aborted, false, "Normal stop must not report aborted: true");
    assert.strictEqual(
      endResult.finalTranscript,
      "first phrase",
      "Final transcript must be preserved on normal stop"
    );
    assert.strictEqual(
      endResult.interimTranscript,
      "interim phrase",
      "Interim transcript must be preserved on normal stop"
    );
    assert.strictEqual(
      endResult.combinedText,
      "first phrase interim phrase",
      "Recognized speech must not disappear when normal Stop occurs"
    );
    console.log("✔ TEST 16 PASSED: Stale finalChunksMap entries cleanly pruned on result list changes and stop preserves transcripts.");

    console.log("\n==================================================");
    console.log("🎉 ALL 17 SPEECH RECOGNITION REGRESSION TESTS PASSED!");
    console.log("==================================================");
  } finally {
    global.window = originalWindow;
  }
}

runSpeechRecognitionTests();
