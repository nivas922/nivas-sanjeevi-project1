import assert from "node:assert";
import { env } from "../src/config/env.js";
process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

import { app } from "../src/app.js";
import { Book } from "../src/models/Book.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { DoubtRetrievalService } from "../src/services/doubtRetrievalService.js";
import { AiTutorService } from "../src/services/aiTutorService.js";
import { AiSummaryService } from "../src/services/aiSummaryService.js";

async function runTextbookGroundedDoubtSolverTests() {
  console.log("==================================================");
  console.log("🚀 TEXTBOOK-GROUNDED AI DOUBT SOLVER TEST SUITE");
  console.log("==================================================\n");

  const PORT = 5575;
  const server = app.listen(PORT);
  const BASE_URL = `http://127.0.0.1:${PORT}/api`;

  try {
    // Setup test users
    const timestamp = Date.now();
    const emailA = `doubt.studenta.${timestamp}@university.edu`;
    const emailB = `doubt.studentb.${timestamp}@university.edu`;

    const signupARes = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, name: "Alice Net", password: "Password123!" })
    });
    const signupAData = await signupARes.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, otp: signupAData.devOtp })
    });

    const signupBRes = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, name: "Bob Bio", password: "Password123!" })
    });
    const signupBData = await signupBRes.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, otp: signupBData.devOtp })
    });

    const loginARes = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password: "Password123!" })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.token;
    const userAId = loginAData.user.id;

    const loginBRes = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, password: "Password123!" })
    });
    const loginBData = await loginBRes.json();
    const tokenB = loginBData.token;
    const userBId = loginBData.user.id;

    // Create Test Books
    const bookNetId = `book_net_${timestamp}`;
    const bookBioId = `book_bio_${timestamp}`;
    const bookEmptyId = `book_empty_${timestamp}`;

    const bookNet = await Book.create({
      id: bookNetId,
      user_id: userAId,
      file_url: "/uploads/network_architecture.pdf",
      title: "Computer Networks and Layer Protocols",
      subject: "Computer Networks",
      extracted_text: "TCP provides connection-oriented reliable byte stream delivery using a 3-way handshake."
    });

    const chunkNet1 = await DocumentChunk.create({
      id: `chk_net1_${timestamp}`,
      book_id: bookNet.id,
      chapter: "Chapter 4: Transport Protocols",
      section: "4.2 TCP 3-Way Handshake",
      page_start: 104,
      page_end: 107,
      chunk_index: 0,
      text: "The TCP 3-way handshake operates as follows: the client transmits a SYN packet with an initial sequence number. The server responds with SYN-ACK acknowledging the client sequence. Finally, the client sends an ACK packet, establishing the active full-duplex socket connection."
    });

    const chunkNet2 = await DocumentChunk.create({
      id: `chk_net2_${timestamp}`,
      book_id: bookNet.id,
      chapter: "Chapter 4: Transport Protocols",
      section: "4.5 UDP Datagrams",
      page_start: 110,
      page_end: 112,
      chunk_index: 1,
      text: "UDP is an unreliable connectionless transport protocol providing minimal message encapsulation with zero handshake latency."
    });

    const bookBio = await Book.create({
      id: bookBioId,
      user_id: userBId,
      file_url: "/uploads/plant_physiology.pdf",
      title: "Plant Physiology and Cellular Biology",
      subject: "Biology",
      extracted_text: "Chloroplast thylakoids capture light energy for ATP synthesis."
    });

    const chunkBio1 = await DocumentChunk.create({
      id: `chk_bio1_${timestamp}`,
      book_id: bookBio.id,
      chapter: "Chapter 8: Photosynthesis",
      section: "8.1 Thylakoid Light Harvesting",
      page_start: 215,
      page_end: 218,
      chunk_index: 0,
      text: "During light-dependent reactions of photosynthesis, chlorophyll a in photosystem II reaction centers absorbs photons, initiating electron transport down the cytochrome b6f complex to synthesize ATP and NADPH in plant chloroplasts."
    });

    const bookEmpty = await Book.create({
      id: bookEmptyId,
      user_id: userAId,
      file_url: "/uploads/scanned_or_empty.pdf",
      title: "Scanned Document Without OCR",
      subject: "General",
      extracted_text: ""
    });

    // ----------------------------------------------------
    // TEST 1: Question answered from a relevant textbook passage
    // ----------------------------------------------------
    console.log("[TEST 1] Question answered from a relevant textbook passage");
    const res1 = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: bookNet.id,
        question: "How does the TCP 3-way handshake establish a connection?",
        language: "en"
      })
    });
    const data1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.hasRelevantContent, true);
    assert.strictEqual(data1.insufficientEvidence, false);
    assert.ok(data1.answer.includes("TCP") || data1.answer.includes("handshake"));
    assert.ok(Array.isArray(data1.sources) && data1.sources.length > 0);
    console.log("✔ TEST 1 PASSED: Relevant textbook passage retrieved and answered.");

    // ----------------------------------------------------
    // TEST 2: Correct chapter, section and page references
    // ----------------------------------------------------
    console.log("\n[TEST 2] Correct chapter and page references in sources");
    const topSource = data1.sources[0];
    assert.strictEqual(topSource.chunkId, chunkNet1.id);
    assert.strictEqual(topSource.chapter, "Chapter 4: Transport Protocols");
    assert.strictEqual(topSource.section, "4.2 TCP 3-Way Handshake");
    assert.strictEqual(topSource.pageStart, 104);
    assert.strictEqual(topSource.pageEnd, 107);
    console.log("✔ TEST 2 PASSED: Chapter, section, and page start/end accurately mapped from chunk.");

    // ----------------------------------------------------
    // TEST 3: Question whose answer is absent from the selected textbook
    // ----------------------------------------------------
    console.log("\n[TEST 3] Question absent from the selected textbook returns honest insufficient evidence");
    const res3 = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: bookNet.id,
        question: "What is quantum gravity and string theory landscape?",
        language: "en"
      })
    });
    const data3 = await res3.json();
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(data3.hasRelevantContent, false);
    assert.strictEqual(data3.insufficientEvidence, true);
    assert.strictEqual(data3.confidence, "none");
    assert.ok(data3.answer.includes("does not contain enough information"));
    assert.strictEqual(data3.sources.length, 0);
    console.log("✔ TEST 3 PASSED: Out-of-textbook question returns safe boundary disclaimer without hallucinations.");

    // ----------------------------------------------------
    // TEST 4: Two textbooks containing different subjects
    // ----------------------------------------------------
    console.log("\n[TEST 4] Two textbooks containing different subjects (Isolation)");
    const resBio = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bookId: bookBio.id,
        question: "What happens in thylakoid light harvesting during photosynthesis?",
        language: "en"
      })
    });
    const dataBio = await resBio.json();
    assert.strictEqual(dataBio.hasRelevantContent, true);
    assert.strictEqual(dataBio.sources[0].chunkId, chunkBio1.id);
    assert.strictEqual(dataBio.sources[0].chapter, "Chapter 8: Photosynthesis");

    const resBioOnNet = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: bookNet.id,
        question: "What happens in thylakoid light harvesting during photosynthesis?",
        language: "en"
      })
    });
    const dataBioOnNet = await resBioOnNet.json();
    assert.strictEqual(dataBioOnNet.hasRelevantContent, false);
    assert.strictEqual(dataBioOnNet.insufficientEvidence, true);
    console.log("✔ TEST 4 PASSED: Distinct subject textbooks completely isolated.");

    // ----------------------------------------------------
    // TEST 5: Cross-user and cross-book isolation
    // ----------------------------------------------------
    console.log("\n[TEST 5] Cross-user and cross-book retrieval isolation");
    const retrievedChunksNet = await DoubtRetrievalService.retrieveRelevantChunks(bookNet.id, "packet protocol handshake", 5);
    for (const chunk of retrievedChunksNet.chunks) {
      assert.strictEqual(chunk.book_id, bookNet.id);
      assert.notStrictEqual(chunk.book_id, bookBio.id);
    }

    const retrievedChunksBio = await DoubtRetrievalService.retrieveRelevantChunks(bookBio.id, "chlorophyll thylakoid photosystem", 5);
    for (const chunk of retrievedChunksBio.chunks) {
      assert.strictEqual(chunk.book_id, bookBio.id);
      assert.notStrictEqual(chunk.book_id, bookNet.id);
    }
    console.log("✔ TEST 5 PASSED: SQL queries strictly scoped to target bookId with zero cross-book leakage.");

    // ----------------------------------------------------
    // TEST 6: Follow-up questions and textbook switching
    // ----------------------------------------------------
    console.log("\n[TEST 6] Follow-up questions with conversationHistory and textbook switching");
    const history = [
      { role: "user", text: "What is TCP 3-way handshake?" },
      { role: "assistant", text: "The 3-way handshake uses SYN, SYN-ACK, and ACK packets." }
    ];

    const resFollowUp = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: bookNet.id,
        question: "What happens if we use UDP instead?",
        language: "en",
        conversationHistory: history
      })
    });
    const dataFollowUp = await resFollowUp.json();
    assert.strictEqual(resFollowUp.status, 200);
    assert.strictEqual(dataFollowUp.success, true);
    assert.strictEqual(dataFollowUp.hasRelevantContent, true);
    assert.strictEqual(dataFollowUp.sources[0].chunkId, chunkNet2.id);

    const resSwitched = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        bookId: bookBio.id,
        question: "Explain chlorophyll in thylakoid membranes",
        language: "en",
        conversationHistory: []
      })
    });
    const dataSwitched = await resSwitched.json();
    assert.strictEqual(dataSwitched.success, true);
    assert.strictEqual(dataSwitched.sources[0].chunkId, chunkBio1.id);
    console.log("✔ TEST 6 PASSED: Follow-up re-retrieves on current question; switching textbooks cleanly resets context.");

    // ----------------------------------------------------
    // TEST 7: Empty or scanned PDFs without extractable text
    // ----------------------------------------------------
    console.log("\n[TEST 7] Empty or scanned PDF without extractable text chunks");
    const resEmpty = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: bookEmpty.id,
        question: "Summarize the major thesis in this book",
        language: "en"
      })
    });
    const dataEmpty = await resEmpty.json();
    assert.strictEqual(resEmpty.status, 200);
    assert.strictEqual(dataEmpty.hasRelevantContent, false);
    assert.strictEqual(dataEmpty.insufficientEvidence, true);
    assert.strictEqual(dataEmpty.confidence, "none");
    assert.strictEqual(dataEmpty.sources.length, 0);
    assert.ok(dataEmpty.answer.includes("does not contain enough information"));
    console.log("✔ TEST 7 PASSED: Empty/scanned documents return graceful honest response.");

    // ----------------------------------------------------
    // TEST 8: Gemini error resilience (timeout, quota, malformed output)
    // ----------------------------------------------------
    console.log("\n[TEST 8] Gemini error resilience and malformed output handling");
    const origCall = AiSummaryService.callGeminiApiWithRetry;
    try {
      AiSummaryService.callGeminiApiWithRetry = async () => "Not a valid JSON response from model {";
      try {
        await AiTutorService.answerDoubt({
          bookId: bookNet.id,
          question: "Explain TCP handshake",
          userId: userAId
        });
        assert.fail("Should throw 502 for unparseable format");
      } catch (err) {
        assert.strictEqual(err.statusCode, 502);
        assert.ok(err.message.includes("unparseable"));
      }

      AiSummaryService.callGeminiApiWithRetry = async () => {
        const quotaErr = new Error("Gemini API error 429: Resource has been exhausted");
        quotaErr.statusCode = 429;
        throw quotaErr;
      };
      try {
        await AiTutorService.answerDoubt({
          bookId: bookNet.id,
          question: "Explain TCP handshake",
          userId: userAId
        });
        assert.fail("Should propagate 429 quota error");
      } catch (err) {
        assert.strictEqual(err.statusCode, 429);
      }
    } finally {
      AiSummaryService.callGeminiApiWithRetry = origCall;
    }
    console.log("✔ TEST 8 PASSED: Malformed output and quota errors handled cleanly with proper status codes.");

    // ----------------------------------------------------
    // TEST 9: Relevance threshold behavior
    // ----------------------------------------------------
    console.log("\n[TEST 9] Relevance threshold prevents low-similarity false positives");
    const thresholdResult = await DoubtRetrievalService.retrieveRelevantChunks(
      bookNet.id,
      "What is the botanical classification of Rosa gallica?",
      5
    );
    assert.strictEqual(thresholdResult.hasRelevantContent, false);
    assert.strictEqual(thresholdResult.insufficientEvidence, true);
    assert.strictEqual(thresholdResult.chunks.length, 0);
    assert.strictEqual(thresholdResult.confidence, "none");
    console.log("✔ TEST 9 PASSED: Below-threshold queries filtered out deterministically.");

    // ----------------------------------------------------
    // TEST 10: Existing doubt-solver regression cases
    // ----------------------------------------------------
    console.log("\n[TEST 10] Existing doubt-solver regression checks");
    const resNoBook = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "What is TCP?" })
    });
    assert.strictEqual(resNoBook.status, 400);

    const resNoQ = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: bookNet.id, question: "   " })
    });
    assert.strictEqual(resNoQ.status, 400);

    const resBadBook = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: "non-existent-book-404", question: "What is TCP?" })
    });
    assert.strictEqual(resBadBook.status, 404);

    const resBadLang = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: bookNet.id, question: "What is TCP?", language: "elvish" })
    });
    assert.strictEqual(resBadLang.status, 400);

    const resSchema = await fetch(`${BASE_URL}/ask-doubt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        bookId: bookNet.id,
        question: "Explain TCP handshake",
        language: "en"
      })
    });
    const dataSchema = await resSchema.json();
    assert.strictEqual(resSchema.status, 200);
    assert.ok("answer" in dataSchema);
    assert.ok("sources" in dataSchema);
    assert.ok("source" in dataSchema);
    assert.ok("confidence" in dataSchema);
    assert.ok("insufficientEvidence" in dataSchema);
    assert.ok("hasRelevantContent" in dataSchema);
    assert.ok("followUpSuggestions" in dataSchema);
    assert.ok("keyPoints" in dataSchema);
    console.log("✔ TEST 10 PASSED: All regression cases and structured schema fields validated.");

    console.log("\n==================================================");
    console.log("🎉 ALL 10 TEXTBOOK-GROUNDED DOUBT SOLVER TESTS PASSED!");
    console.log("==================================================\n");
  } finally {
    server.close();
  }
}

runTextbookGroundedDoubtSolverTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  });
