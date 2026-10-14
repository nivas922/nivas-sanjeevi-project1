import assert from "assert";
import { initDb, dbRun } from "../src/config/db.js";
import { Book } from "../src/models/Book.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { Quiz } from "../src/models/Quiz.js";
import { User } from "../src/models/User.js";
import { AdaptiveLearningService, ADAPTIVE_CONFIG } from "../src/services/adaptiveLearningService.js";
import { AiService } from "../src/services/aiService.js";
import { AiSummaryService } from "../src/services/aiSummaryService.js";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";

process.env.NODE_ENV = "test";
env.NODE_ENV = "test";

const TEST_PORT = 5577;
let server;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

const runSubjectAgnosticTests = async () => {
  console.log("\n🧪 Running Subject-Agnostic AI Recommendation Engine Regression Test Suite...\n");

  await initDb();
  await dbRun("DELETE FROM summaries");
  await dbRun("DELETE FROM document_chunks WHERE book_id LIKE 'book_sar_%'");
  await dbRun("DELETE FROM quizzes WHERE user_id LIKE 'usr_sar_%'");
  await dbRun("DELETE FROM books WHERE id LIKE 'book_sar_%'");
  await dbRun("DELETE FROM users WHERE id LIKE 'usr_sar_%'");

  server = app.listen(TEST_PORT);
  console.log(` Test server listening on port ${TEST_PORT}\n`);

  try {
    // -------------------------------------------------------------------------
    // SETUP: Two Distinct Users (Alpha & Beta)
    // -------------------------------------------------------------------------
    console.log("Setting up Student Alpha (CS/Math) and Student Beta (Botany/Physics)...");

    // Student Alpha
    const emailAlpha = `sar.alpha.${Date.now()}@university.edu`;
    const signupAlpha = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Student Alpha", email: emailAlpha, password: "password123" })
    });
    const dataSignupAlpha = await signupAlpha.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailAlpha, otp: dataSignupAlpha.devOtp })
    });
    const loginAlpha = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailAlpha, password: "password123" })
    });
    const { token: tokenAlpha, user: userAlpha } = await loginAlpha.json();

    // Student Beta
    const emailBeta = `sar.beta.${Date.now()}@university.edu`;
    const signupBeta = await fetch(`${BASE_URL}/auth/email/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Student Beta", email: emailBeta, password: "password123" })
    });
    const dataSignupBeta = await signupBeta.json();
    await fetch(`${BASE_URL}/auth/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailBeta, otp: dataSignupBeta.devOtp })
    });
    const loginBeta = await fetch(`${BASE_URL}/auth/email/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailBeta, password: "password123" })
    });
    const { token: tokenBeta, user: userBeta } = await loginBeta.json();

    // -------------------------------------------------------------------------
    // SETUP: 4 Multi-Subject Synthetic Textbooks
    // -------------------------------------------------------------------------
    console.log("Creating 4 distinct multi-subject synthetic textbook fixtures...");

    // Fixture 1: Plant Biology (Student Beta)
    const bookPlant = await Book.create({
      id: `book_sar_plant_${Date.now()}`,
      user_id: userBeta.id,
      file_url: "/uploads/plant_physiology.pdf",
      title: "Plant Cellular Physiology & Agriscience",
      subject: "Biology & Agriculture",
      extracted_text: "Photosynthesis converts light energy into chemical energy inside chloroplasts. The Calvin cycle synthesizes glucose in the stroma."
    });
    await DocumentChunk.createMany([
      {
        book_id: bookPlant.id,
        chapter: "CHAPTER 1: THYLAKOID BIOENERGETICS",
        section: "1.1 Light-Dependent Reactions",
        pageStart: 1,
        pageEnd: 5,
        text: "Photosynthesis converts light energy into chemical energy inside thylakoid membranes using chlorophyll pigments."
      },
      {
        book_id: bookPlant.id,
        chapter: "CHAPTER 2: CALVIN CYCLE & CARBON FIXATION",
        section: "2.1 Dark Reactions",
        pageStart: 6,
        pageEnd: 10,
        text: "RuBisCO catalyzes carbon fixation in the stroma fluid of chloroplasts, producing glyceraldehyde 3-phosphate."
      }
    ]);

    // Fixture 2: Computer Science & Networking (Student Alpha)
    const bookCS = await Book.create({
      id: `book_sar_cs_${Date.now()}`,
      user_id: userAlpha.id,
      file_url: "/uploads/distributed_networking.pdf",
      title: "Distributed Operating Systems & Networking",
      subject: "Computer Science",
      extracted_text: "TCP establishes connections through a 3-way handshake. Raft consensus ensures distributed log replication."
    });
    await DocumentChunk.createMany([
      {
        book_id: bookCS.id,
        chapter: "CHAPTER 1: TCP PROTOCOL & HANDSHAKE",
        section: "1.1 Transport Layer Handshake",
        pageStart: 1,
        pageEnd: 8,
        text: "TCP provides reliable, sequenced data transmission via SYN, SYN-ACK, and ACK handshake sequence numbers."
      },
      {
        book_id: bookCS.id,
        chapter: "CHAPTER 2: DISTRIBUTED CONSENSUS",
        section: "2.1 Raft Algorithm",
        pageStart: 9,
        pageEnd: 15,
        text: "Raft elects a cluster leader to manage distributed state machine log replication across network partitions."
      }
    ]);

    // Fixture 3: Mathematics (Student Alpha)
    const bookMath = await Book.create({
      id: `book_sar_math_${Date.now()}`,
      user_id: userAlpha.id,
      file_url: "/uploads/calculus_linear_algebra.pdf",
      title: "Advanced Differential Calculus & Linear Algebra",
      subject: "Mathematics",
      extracted_text: "Epsilon-delta definitions formally characterize continuous functions. Eigenvalues determine characteristic matrix roots."
    });
    await DocumentChunk.createMany([
      {
        book_id: bookMath.id,
        chapter: "CHAPTER 1: EPSILON-DELTA LIMITS",
        section: "1.1 Rigorous Limit Analysis",
        pageStart: 1,
        pageEnd: 12,
        text: "For every epsilon greater than zero, there exists a delta such that distance bounds constrain function outputs."
      },
      {
        book_id: bookMath.id,
        chapter: "CHAPTER 2: MATRIX EIGENVALUES",
        section: "2.1 Characteristic Polynomials",
        pageStart: 13,
        pageEnd: 24,
        text: "Eigenvectors satisfy the equation A v equals lambda v, revealing directional invariance under linear transformations."
      }
    ]);

    // Fixture 4: Physical Chemistry (Student Beta)
    const bookPhysics = await Book.create({
      id: `book_sar_phys_${Date.now()}`,
      user_id: userBeta.id,
      file_url: "/uploads/physical_chemistry.pdf",
      title: "Chemical Thermodynamics & Quantum Mechanics",
      subject: "Physical Chemistry",
      extracted_text: "Carnot cycles define maximum thermodynamic efficiency between thermal reservoirs. Schrödinger equations describe wavefunctions."
    });
    await DocumentChunk.createMany([
      {
        book_id: bookPhysics.id,
        chapter: "CHAPTER 1: CARNOT CYCLE EFFICIENCY",
        section: "1.1 Reversible Heat Engines",
        pageStart: 1,
        pageEnd: 7,
        text: "Carnot engine efficiency is strictly bounded by reservoir temperatures T hot and T cold according to the second law of thermodynamics."
      },
      {
        book_id: bookPhysics.id,
        chapter: "CHAPTER 2: WAVE-PARTICLE DUALITY",
        section: "2.1 Schrödinger Equations",
        pageStart: 8,
        pageEnd: 16,
        text: "The time-dependent Schrödinger equation governs quantum probability density distributions in microscopic potential wells."
      }
    ]);

    // =========================================================================
    // TEST 1: Subject Topic Extraction & Quiz Generation (Subject-Agnostic)
    // =========================================================================
    console.log("\n[TEST 1] Generate dynamic quizzes across all 4 subjects and verify subject-specific topic derivation");

    const quizMath = await AiService.generateQuizQuestions({
      bookId: bookMath.id,
      bookTitle: bookMath.title,
      subject: bookMath.subject,
      numQuestions: 4
    });
    assert.strictEqual(quizMath.length, 4, "Math quiz must contain 4 questions");
    const mathTopics = quizMath.map((q) => q.topic);
    assert.ok(
      mathTopics.some((t) => t.toLowerCase().includes("limit") || t.toLowerCase().includes("eigenvalue") || t.toLowerCase().includes("calculus")),
      `Math quiz must derive math-specific topics from content: ${JSON.stringify(mathTopics)}`
    );
    // Plant topics MUST NOT leak into Mathematics
    assert.ok(
      !mathTopics.some((t) => /plant|photosynthesis|chloroplast|leaf|stroma/i.test(t)),
      "Plant topics must NEVER leak into Mathematics quiz"
    );
    console.log("  ✔ PASSED: Mathematics quiz generated with authentic calculus topics and zero plant leakage.");

    const quizPhys = await AiService.generateQuizQuestions({
      bookId: bookPhysics.id,
      bookTitle: bookPhysics.title,
      subject: bookPhysics.subject,
      numQuestions: 4
    });
    assert.strictEqual(quizPhys.length, 4, "Physical chemistry quiz must contain 4 questions");
    const physTopics = quizPhys.map((q) => q.topic);
    assert.ok(
      physTopics.some((t) => t.toLowerCase().includes("carnot") || t.toLowerCase().includes("wave") || t.toLowerCase().includes("thermodynamics")),
      `Physics quiz must derive physics topics: ${JSON.stringify(physTopics)}`
    );
    assert.ok(
      !physTopics.some((t) => /plant|photosynthesis|chloroplast/i.test(t)),
      "Plant topics must NEVER leak into Physical Chemistry quiz"
    );
    console.log("  ✔ PASSED: Physical Chemistry quiz generated with authentic thermodynamics topics.");

    // Test 1b: Verify Plant Biology quiz generates authentic botany topics
    const quizPlant = await AiService.generateQuizQuestions({
      bookId: bookPlant.id,
      bookTitle: bookPlant.title,
      subject: bookPlant.subject,
      numQuestions: 4
    });
    assert.strictEqual(quizPlant.length, 4, "Plant biology quiz must contain 4 questions");
    const plantTopics = quizPlant.map((q) => q.topic);
    assert.ok(
      plantTopics.some((t) => /thylakoid|calvin|photosynthesis|bioenergetics/i.test(t)),
      `Plant biology quiz must retain genuine plant biology topics: ${JSON.stringify(plantTopics)}`
    );
    console.log("  ✔ PASSED: Plant Biology quiz correctly retains authentic botany topics.");

    // Test 1c: Regression Test - "Chemical Plant Processing" must NOT trigger photosynthesis
    const bookChemPlant = await Book.create({
      id: `book_sar_chemplant_${Date.now()}`,
      user_id: userBeta.id,
      file_url: "/uploads/chem_plant.pdf",
      title: "Chemical Plant Processing & Industrial Reactors",
      subject: "Chemical Engineering",
      extracted_text: "Continuous stirred-tank reactors require strict isothermal controls. Distillation columns separate volatile hydrocarbon fractions."
    });
    await DocumentChunk.createMany([
      {
        book_id: bookChemPlant.id,
        chapter: "CHAPTER 1: REACTOR DESIGN & MASS BALANCE",
        section: "1.1 CSTR Operations",
        pageStart: 1,
        pageEnd: 6,
        text: "Continuous stirred-tank reactors operate under steady-state conditions with uniform concentration profiles in chemical plant facilities."
      },
      {
        book_id: bookChemPlant.id,
        chapter: "CHAPTER 2: FRACTIONAL DISTILLATION COLUMNS",
        section: "2.1 Vapor-Liquid Equilibrium",
        pageStart: 7,
        pageEnd: 14,
        text: "Reboilers supply vapor traffic to maintain McCabe-Thiele separation trays across petroleum refining plants."
      }
    ]);

    const quizChemPlant = await AiService.generateQuizQuestions({
      bookId: bookChemPlant.id,
      bookTitle: bookChemPlant.title,
      subject: bookChemPlant.subject,
      numQuestions: 4
    });
    assert.strictEqual(quizChemPlant.length, 4, "Chemical plant quiz must contain 4 questions");
    const chemPlantTopics = quizChemPlant.map((q) => q.topic);
    assert.ok(
      chemPlantTopics.some((t) => /reactor|distillation|cstr|equilibrium/i.test(t)),
      `Chemical plant quiz must derive chemical engineering topics: ${JSON.stringify(chemPlantTopics)}`
    );
    assert.ok(
      !chemPlantTopics.some((t) => /photosynthesis|chloroplast|calvin cycle|chlorophyll|thylakoid/i.test(t)),
      "Chemical Plant Processing must NEVER trigger photosynthesis/chloroplast questions"
    );
    console.log("  ✔ PASSED: 'Chemical Plant Processing' correctly generates reactor topics with zero photosynthesis leakage.");

    // Test 1d: Regression Test - "Power Plant Turbines" must NOT trigger photosynthesis
    const bookPowerPlant = await Book.create({
      id: `book_sar_powerplant_${Date.now()}`,
      user_id: userAlpha.id,
      file_url: "/uploads/power_plant.pdf",
      title: "Power Plant Turbines & Thermal Energy Generation",
      subject: "Mechanical Engineering",
      extracted_text: "Superheated steam expands through multi-stage high-pressure turbine rotors. Rankine reheat cycles improve power plant thermal efficiency."
    });
    await DocumentChunk.createMany([
      {
        book_id: bookPowerPlant.id,
        chapter: "CHAPTER 1: STEAM TURBINE DYNAMICS",
        section: "1.1 Blade Cascade Aerodynamics",
        pageStart: 1,
        pageEnd: 8,
        text: "Steam expansion across impulse and reaction turbine stages drives alternator shaft generation in thermal power plant stations."
      },
      {
        book_id: bookPowerPlant.id,
        chapter: "CHAPTER 2: RANKINE REHEAT CYCLES",
        section: "2.1 Condenser Operations",
        pageStart: 9,
        pageEnd: 15,
        text: "Surface condensers maintain low turbine backpressure to maximize power plant thermodynamic enthalpy drop."
      }
    ]);

    const quizPowerPlant = await AiService.generateQuizQuestions({
      bookId: bookPowerPlant.id,
      bookTitle: bookPowerPlant.title,
      subject: bookPowerPlant.subject,
      numQuestions: 4
    });
    assert.strictEqual(quizPowerPlant.length, 4, "Power plant quiz must contain 4 questions");
    const powerPlantTopics = quizPowerPlant.map((q) => q.topic);
    assert.ok(
      powerPlantTopics.some((t) => /turbine|rankine|steam|condenser/i.test(t)),
      `Power plant quiz must derive mechanical engineering topics: ${JSON.stringify(powerPlantTopics)}`
    );
    assert.ok(
      !powerPlantTopics.some((t) => /photosynthesis|chloroplast|calvin cycle|chlorophyll|thylakoid/i.test(t)),
      "Power Plant Turbines must NEVER trigger photosynthesis/chloroplast questions"
    );
    console.log("  ✔ PASSED: 'Power Plant Turbines' correctly generates mechanical engineering topics with zero photosynthesis leakage.");

    // Test 1e: Standalone chunkless mock generation verification
    const chunklessChem = JSON.parse(
      AiSummaryService.generateMockQuizJsonFromPrompt(
        "Requested Question Count: 3\nTextbook Title: Chemical Plant Processing\nSubject: Chemical Engineering"
      )
    );
    assert.ok(
      !chunklessChem.questions.some((q) => /photosynthesis|chloroplast|calvin/i.test(q.question + q.explanation)),
      "Chunkless Chemical Plant must not trigger photosynthesis pool"
    );
    assert.strictEqual(chunklessChem.questions[0].topic, "Chemical Plant Processing");

    const chunklessPower = JSON.parse(
      AiSummaryService.generateMockQuizJsonFromPrompt(
        "Requested Question Count: 3\nTextbook Title: Power Plant Turbines\nSubject: Mechanical Engineering"
      )
    );
    assert.ok(
      !chunklessPower.questions.some((q) => /photosynthesis|chloroplast|calvin/i.test(q.question + q.explanation)),
      "Chunkless Power Plant must not trigger photosynthesis pool"
    );
    assert.strictEqual(chunklessPower.questions[0].topic, "Power Plant Turbines");

    const chunklessPlantBenchmark = JSON.parse(
      AiSummaryService.generateMockQuizJsonFromPrompt(
        "Requested Question Count: 3\nSubject: Plant Biology & Photosynthesis benchmark"
      )
    );
    assert.ok(
      chunklessPlantBenchmark.questions.some((q) => /photosynthesis|chloroplast/i.test(q.question)),
      "Explicit Plant Biology benchmark must still utilize benchmark questions"
    );
    console.log("  ✔ PASSED: Standalone chunkless mock generator strictly respects engineering vs. plant benchmark rules.");

    // Clean up temporary regression test fixtures
    await Book.deleteById(bookChemPlant.id);
    await Book.deleteById(bookPowerPlant.id);

    // =========================================================================
    // TEST 2: Multi-Topic Quiz Performance & Subject-Agnostic Recommendations
    // =========================================================================
    console.log("\n[TEST 2] Submit Mathematics quiz with mixed performance and verify recommendations reflect real Math topics");

    // Persist Math Quiz and simulate Student Alpha submission:
    // Topic 1 ("Epsilon-Delta Limits"): 1/2 correct (50% -> Needs Improvement)
    // Topic 2 ("Matrix Eigenvalues"): 2/2 correct (100% -> Strong)
    const mathQuizRecord = await Quiz.create({
      id: `quiz_sar_math_${Date.now()}`,
      book_id: bookMath.id,
      user_id: userAlpha.id,
      num_questions: 4,
      questions: [
        { id: "qm1", question: "What is delta in limits?", options: ["A", "B", "C", "D"], correctAnswer: 0, topic: "Epsilon-Delta Limits", difficulty: "easy" },
        { id: "qm2", question: "How does epsilon bound error?", options: ["A", "B", "C", "D"], correctAnswer: 0, topic: "Epsilon-Delta Limits", difficulty: "medium" },
        { id: "qm3", question: "What is an eigenvalue?", options: ["A", "B", "C", "D"], correctAnswer: 0, topic: "Matrix Eigenvalues", difficulty: "medium" },
        { id: "qm4", question: "How to diagonalize a matrix?", options: ["A", "B", "C", "D"], correctAnswer: 0, topic: "Matrix Eigenvalues", difficulty: "hard" }
      ]
    });

    await Quiz.recordSubmission({
      id: mathQuizRecord.id,
      score: 3,
      total_questions: 4,
      percentage: 75,
      performance_level: "Good",
      answers: [
        { questionId: "qm1", isCorrect: true, topic: "Epsilon-Delta Limits", difficulty: "easy" },
        { questionId: "qm2", isCorrect: false, topic: "Epsilon-Delta Limits", difficulty: "medium", explanation: "Delta must satisfy epsilon bounds." },
        { questionId: "qm3", isCorrect: true, topic: "Matrix Eigenvalues", difficulty: "medium" },
        { questionId: "qm4", isCorrect: true, topic: "Matrix Eigenvalues", difficulty: "hard" }
      ]
    });

    // Request recommendations specifically for bookMath
    const mathRecs = await AdaptiveLearningService.generatePersonalizedRecommendations(userAlpha.id, bookMath.id);
    assert.ok(mathRecs.length > 0, "Recommendations must be generated for Mathematics");
    const recTopics = mathRecs.map((r) => r.topic);
    assert.ok(
      recTopics.some((t) => t.includes("Epsilon-Delta") || t.includes("Matrix Eigenvalues")),
      `Recommendations must reference real Mathematics topics: ${JSON.stringify(recTopics)}`
    );
    assert.ok(
      !recTopics.some((t) => /plant|photosynthesis|botany|agriculture/i.test(t)),
      "Plant topics must NEVER appear in Mathematics recommendations"
    );

    // Verify learning path references Mathematics
    const mathPath = await AdaptiveLearningService.generateOrderedLearningPath(userAlpha.id, bookMath.id, await AdaptiveLearningService.getTopicPerformance(userAlpha.id, bookMath.id));
    assert.ok(mathPath.length >= 3, "Learning path must generate structured sequential steps");
    assert.ok(
      mathPath.some((s) => s.title.includes("Epsilon-Delta") || s.topic.includes("Epsilon-Delta")),
      "Step 1 or 2 must target the weak mathematics topic"
    );
    assert.strictEqual(mathPath[0].step, 1, "First step must be index 1");
    console.log("  ✔ PASSED: Mathematics recommendations and learning path accurately derived with zero plant contamination.");

    // =========================================================================
    // TEST 3: Textbook Switching & Isolation
    // =========================================================================
    console.log("\n[TEST 3] Switch between textbooks and verify analytics adapt to the selected book");

    // Add CS Quiz for Student Alpha
    const csQuizRecord = await Quiz.create({
      id: `quiz_sar_cs_${Date.now()}`,
      book_id: bookCS.id,
      user_id: userAlpha.id,
      num_questions: 2,
      questions: [
        { id: "qc1", question: "What is TCP SYN?", options: ["A", "B", "C", "D"], correctAnswer: 0, topic: "TCP Protocol & Handshake", difficulty: "medium" },
        { id: "qc2", question: "What is Raft?", options: ["A", "B", "C", "D"], correctAnswer: 0, topic: "Distributed Consensus", difficulty: "hard" }
      ]
    });
    await Quiz.recordSubmission({
      id: csQuizRecord.id,
      score: 2,
      total_questions: 2,
      percentage: 100,
      performance_level: "Strong",
      answers: [
        { questionId: "qc1", isCorrect: true, topic: "TCP Protocol & Handshake", difficulty: "medium" },
        { questionId: "qc2", isCorrect: true, topic: "Distributed Consensus", difficulty: "hard" }
      ]
    });

    // Query analytics for Math book
    const resMathAnalytics = await fetch(`${BASE_URL}/adaptive-learning/analytics/${userAlpha.id}?bookId=${bookMath.id}`, {
      headers: { Authorization: `Bearer ${tokenAlpha}` }
    });
    const dataMathAnalytics = await resMathAnalytics.json();
    assert.strictEqual(resMathAnalytics.status, 200);
    const mathReportedTopics = dataMathAnalytics.topicPerformance.map((t) => t.topic);
    assert.ok(mathReportedTopics.includes("Epsilon-Delta Limits"), "Math analytics must include Epsilon-Delta Limits");
    assert.ok(!mathReportedTopics.includes("TCP Protocol & Handshake"), "Math analytics must NOT leak CS topics");

    // Query analytics for CS book
    const resCsAnalytics = await fetch(`${BASE_URL}/adaptive-learning/analytics/${userAlpha.id}?bookId=${bookCS.id}`, {
      headers: { Authorization: `Bearer ${tokenAlpha}` }
    });
    const dataCsAnalytics = await resCsAnalytics.json();
    assert.strictEqual(resCsAnalytics.status, 200);
    const csReportedTopics = dataCsAnalytics.topicPerformance.map((t) => t.topic);
    assert.ok(csReportedTopics.includes("TCP Protocol & Handshake"), "CS analytics must include TCP Protocol");
    assert.ok(!csReportedTopics.includes("Epsilon-Delta Limits"), "CS analytics must NOT leak Math topics");
    console.log("  ✔ PASSED: Switching bookId isolates topic performance and recommendations with 100% precision.");

    // =========================================================================
    // TEST 4: Cross-Student Privacy & Data Isolation
    // =========================================================================
    console.log("\n[TEST 4] Verify cross-student private analytics are strictly guarded");

    // Student Alpha attempts to access Student Beta's private analytics
    const resForbidden = await fetch(`${BASE_URL}/adaptive-learning/analytics/${userBeta.id}`, {
      headers: { Authorization: `Bearer ${tokenAlpha}` }
    });
    assert.strictEqual(resForbidden.status, 403, "Cross-student access must return 403 Forbidden");

    // Verify Student Alpha does NOT receive Student Beta's Plant Biology quizzes
    const alphaGeneralAnalytics = await fetch(`${BASE_URL}/adaptive-learning/analytics/${userAlpha.id}`, {
      headers: { Authorization: `Bearer ${tokenAlpha}` }
    });
    const dataAlphaGeneral = await alphaGeneralAnalytics.json();
    const allAlphaTopics = dataAlphaGeneral.topicPerformance.map((t) => t.topic);
    assert.ok(!allAlphaTopics.some((t) => /thylakoid|calvin|photosynthesis|plant/i.test(t)), "Student Alpha must NEVER see Student Beta's plant topics");
    console.log("  ✔ PASSED: Cross-student private records are strictly guarded with 403 and zero topic leakage.");

    // =========================================================================
    // TEST 5: Empty Document Handling (Graceful Message, No Invented Topics)
    // =========================================================================
    console.log("\n[TEST 5] Verify textbook with unextractable/empty text shows clear warning without inventing topics");

    const emptyBook = await Book.create({
      id: `book_sar_empty_${Date.now()}`,
      user_id: userAlpha.id,
      file_url: "/uploads/scanned_unreadable.pdf",
      title: "Scanned Unreadable Document",
      subject: "Unreadable",
      extracted_text: ""
    });

    const resEmptyDoc = await fetch(`${BASE_URL}/adaptive-learning/analytics/${userAlpha.id}?bookId=${emptyBook.id}`, {
      headers: { Authorization: `Bearer ${tokenAlpha}` }
    });
    const dataEmptyDoc = await resEmptyDoc.json();
    assert.strictEqual(resEmptyDoc.status, 200);
    assert.strictEqual(dataEmptyDoc.emptyDocument, true, "Must flag emptyDocument: true");
    assert.ok(dataEmptyDoc.emptyDocumentMessage.includes("no usable extracted text"), "Must provide informative message");
    assert.strictEqual(dataEmptyDoc.topicPerformance.length, 0, "Must NOT invent topics for empty document");
    assert.strictEqual(dataEmptyDoc.recommendations.length, 0, "Must NOT invent recommendations for empty document");
    console.log("  ✔ PASSED: Unusable document produces clear message without fabricating topics.");

    // =========================================================================
    // TEST 6: Insufficient Quiz History Handling (Provisional Suggestions)
    // =========================================================================
    console.log("\n[TEST 6] Verify fresh textbook with no quizzes shows provisional suggestions and explains attempts needed");

    // Create a new History textbook for Student Alpha with chunks but 0 completed quizzes
    const historyBook = await Book.create({
      id: `book_sar_hist_${Date.now()}`,
      user_id: userAlpha.id,
      file_url: "/uploads/modern_history.pdf",
      title: "Modern 20th Century History",
      subject: "History",
      extracted_text: "The Treaty of Versailles restructured European boundaries in 1919."
    });
    await DocumentChunk.createMany([
      {
        book_id: historyBook.id,
        chapter: "CHAPTER 1: TREATY OF VERSAILLES",
        section: "1.1 Post-War Negotiations",
        pageStart: 1,
        pageEnd: 15,
        text: "The Treaty of Versailles established territorial mandates and war reparations."
      },
      {
        book_id: historyBook.id,
        chapter: "CHAPTER 2: LEAGUE OF NATIONS",
        section: "2.1 Collective Security",
        pageStart: 16,
        pageEnd: 30,
        text: "The League of Nations sought to preserve international peace through collective security pacts."
      }
    ]);

    const resHistAnalytics = await fetch(`${BASE_URL}/adaptive-learning/analytics/${userAlpha.id}?bookId=${historyBook.id}`, {
      headers: { Authorization: `Bearer ${tokenAlpha}` }
    });
    const dataHistAnalytics = await resHistAnalytics.json();
    assert.strictEqual(resHistAnalytics.status, 200);
    assert.strictEqual(dataHistAnalytics.insufficientHistory, true, "Must flag insufficientHistory");
    assert.strictEqual(dataHistAnalytics.isProvisional, true, "Must flag isProvisional: true");
    assert.strictEqual(dataHistAnalytics.topicPerformance.length, 0, "Topic performance must be empty pending quizzes");
    assert.ok(
      dataHistAnalytics.provisionalSuggestions.length > 0,
      "Must generate provisional suggestions derived from textbook chapters"
    );
    const provTopics = dataHistAnalytics.provisionalSuggestions.map((s) => s.topic);
    assert.ok(
      provTopics.some((t) => t.includes("VERSAILLES") || t.includes("LEAGUE OF NATIONS")),
      `Provisional suggestions must reference actual history chapters: ${JSON.stringify(provTopics)}`
    );
    assert.ok(dataHistAnalytics.provisionalMessage.includes("No quiz history"), "Must explain that quiz attempts are needed");
    console.log("  ✔ PASSED: Textbook with zero quizzes provides provisional suggestions derived from its chapters.");

    // =========================================================================
    // TEST 7: AI Insights Gemini Fallback & Safe Handling
    // =========================================================================
    console.log("\n[TEST 7] Verify AI learning insights use real analytics without hardcoded plant concepts");

    const topicPerfSample = [
      {
        topic: "Transmission Control Protocol Handshake",
        totalQuestions: 6,
        correctCount: 2,
        accuracy: 33,
        classification: "needs_improvement",
        trend: "stable",
        mistakes: [{ question: "SYN packet", occurrences: 2 }]
      },
      {
        topic: "Distributed Consensus Algorithms",
        totalQuestions: 6,
        correctCount: 5,
        accuracy: 83,
        classification: "strong",
        trend: "improving",
        mistakes: []
      }
    ];

    const aiInsights = await AdaptiveLearningService.generateAiLearningInsights({
      userId: userAlpha.id,
      bookId: bookCS.id,
      topicPerformance: topicPerfSample,
      progressOverTime: { direction: "improving", latestScore: 83, message: "Scores improving" }
    });

    assert.ok(aiInsights, "AI insights must be returned");
    assert.ok(aiInsights.summary.includes("Transmission Control Protocol Handshake"), "Summary must reference real weak topic");
    assert.ok(aiInsights.gapAnalysis.includes("Transmission Control Protocol Handshake"), "Gap analysis must reference real weak topic");
    assert.ok(!/photosynthesis|plant|chloroplast|botany/i.test(JSON.stringify(aiInsights)), "Fallback AI insights must NOT contain plant hallucinations");
    console.log("  ✔ PASSED: AI insights fallback safely derives from real topics without plant hallucinations.");

    // =========================================================================
    // TEST 8: Adaptive Thresholds and Trend Verification
    // =========================================================================
    console.log("\n[TEST 8] Verify classification thresholds (80% Strong, 50-79% In Progress, <50% Needs Improvement)");

    assert.strictEqual(ADAPTIVE_CONFIG.strongThreshold, 80);
    assert.strictEqual(ADAPTIVE_CONFIG.inProgressThreshold, 50);
    assert.strictEqual(ADAPTIVE_CONFIG.needsImprovementThreshold, 50);
    console.log("  ✔ PASSED: Configurable thresholds remain intact and accurate.");

    console.log("\n🎉 ALL 8 SUBJECT-AGNOSTIC RECOMMENDATION ENGINE REGRESSION TESTS PASSED FLAWLESSLY!\n");
  } finally {
    if (server) {
      server.close();
      console.log(" Test server closed.");
    }
  }
};

runSubjectAgnosticTests().catch((err) => {
  console.error("\n❌ Subject-Agnostic Test Failed:", err);
  if (server) server.close();
  process.exit(1);
});
