import { storageService } from "./storageService";
import { MULTILINGUAL_SUMMARIES, SUPPORTED_LANGUAGES, DEPARTMENTS } from "../data/translations";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Authentication & Registration
  async register(userData) {
    await sleep(400);
    const freshUser = storageService.initNewUser({
      name: userData.name || "Student",
      email: userData.email || "student@university.edu",
      department: userData.department || DEPARTMENTS[0]
    });
    return { status: "success", user: freshUser, token: "token_" + Date.now() };
  },

  async login(credentials) {
    await sleep(400);
    let user = storageService.getUser();
    if (!user) {
      user = storageService.initNewUser({
        name: credentials.email ? credentials.email.split("@")[0] : "Student",
        email: credentials.email || "student@university.edu",
        department: DEPARTMENTS[0]
      });
    }
    return { status: "success", user, token: "token_" + Date.now() };
  },

  async loginWithGoogle() {
    await sleep(500);
    const randomId = Math.floor(Math.random() * 899) + 100;
    const googleUser = storageService.initNewUser({
      name: "Google Student",
      email: `student.${randomId}@gmail.com`,
      department: DEPARTMENTS[0],
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=google_${randomId}`
    });
    return { status: "success", user: googleUser, token: "google_token_" + Date.now() };
  },

  async loginWithMobile(phoneNumber, otp) {
    await sleep(500);
    const mobileUser = storageService.initNewUser({
      name: `Student (${phoneNumber.slice(-4)})`,
      email: `user.${phoneNumber.slice(-4)}@mobile.edu`,
      department: DEPARTMENTS[0],
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=mobile_${phoneNumber}`
    });
    return { status: "success", user: mobileUser, token: "otp_token_" + Date.now() };
  },

  async getProfile() {
    let user = storageService.getUser();
    if (!user) {
      user = storageService.initNewUser();
    }
    return { status: "success", user };
  },

  // Textbook Upload and Multilingual Processing Pipeline
  async uploadTextbook(file, metadata, onProgress = () => {}) {
    const isScanned = file.name.endsWith(".png") || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg");
    const stages = [
      { step: 1, label: "Uploading document...", percent: 15 },
      { step: 2, label: isScanned ? "Scanned document detected. Extracting text using Tesseract OCR..." : "Extracting selectable text with PyMuPDF...", percent: 30 },
      { step: 3, label: "Detecting chapters and structural hierarchy...", percent: 45 },
      { step: 4, label: "Analyzing key formulas, definitions and topics...", percent: 60 },
      { step: 5, label: `Generating AI summarization in ${metadata.targetLanguageName || "selected language"}...`, percent: 75 },
      { step: 6, label: "Synthesizing multilingual audio representations...", percent: 85 },
      { step: 7, label: `Creating ${metadata.questionCount || 5}-question adaptive quiz bank...`, percent: 95 },
      { step: 8, label: "Personalized learning curriculum ready!", percent: 100 }
    ];

    for (const stage of stages) {
      await sleep(350);
      onProgress(stage);
    }

    const newId = "tb-" + Date.now();
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const langCode = metadata.targetLanguage || "en";

    const newBook = {
      id: newId,
      title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
      author: metadata.author || "Uploaded Academic Textbook",
      coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
      subject: metadata.subject || cleanTitle,
      category: "Academic",
      pages: Math.floor(Math.random() * 80) + 25,
      chaptersCount: 4,
      progress: 0,
      status: "In Progress",
      lastStudied: "Just now",
      topics: [
        { id: `top-${newId}-1`, name: "Core Architecture & Workflow", mastery: 0, status: "Needs Improvement" },
        { id: `top-${newId}-2`, name: "Protocols & Performance Benchmarks", mastery: 0, status: "Weak" },
      ],
      chapters: [
        { id: `ch-${newId}-1`, number: 1, title: "Overview and Fundamental Concepts", pages: 20 },
        { id: `ch-${newId}-2`, number: 2, title: "Deep Dive: Core Methodology & Implementation", pages: 30 },
      ]
    };

    storageService.addTextbook(newBook);

    // Multilingual summary payload matching selected language
    const langSummaryTemplate = MULTILINGUAL_SUMMARIES[langCode] || MULTILINGUAL_SUMMARIES.en;

    const newSummary = {
      id: "sum-" + Date.now(),
      textbookId: newId,
      bookTitle: newBook.title,
      chapterId: `ch-${newId}-1`,
      chapterTitle: `Chapter 1: ${langSummaryTemplate.title}`,
      topic: `${newBook.title} - Fundamentals`,
      language: langCode,
      difficulty: metadata.difficulty || "Intermediate",
      length: metadata.summaryLength || "Detailed",
      createdDate: new Date().toISOString().split("T")[0],
      readTime: "5 min read",
      summaryText: langSummaryTemplate.summary,
      simpleExplanation: langSummaryTemplate.simpleExplanation,
      keyConcepts: langSummaryTemplate.keyConcepts,
      keyPoints: langSummaryTemplate.keyPoints,
      definitions: langSummaryTemplate.definitions,
      formulas: [
        {
          name: "System Efficiency (η)",
          formula: "η = (Useful Output / Total Energy Input) × 100%",
          description: "Calculates performance ratio under standard operational load."
        }
      ],
      examples: [
        {
          title: "System Pipeline Execution",
          code: `def execute_pipeline(stream):\n    validated = validate_input(stream)\n    return transform_and_emit(validated)`
        }
      ],
      quickRevision: langSummaryTemplate.quickRevision,
      translations: MULTILINGUAL_SUMMARIES
    };

    storageService.addSummary(newSummary);

    // Generate dynamic quiz with selected question count (5, 10, 15, 20)
    const questionCount = parseInt(metadata.questionCount || 5, 10);
    const newQuiz = await this.generateQuiz({
      textbookId: newId,
      summaryId: newSummary.id,
      topic: newSummary.topic,
      subject: newBook.subject,
      difficulty: metadata.difficulty || "Intermediate",
      questionCount: questionCount,
      language: langCode
    });

    return { status: "success", textbook: newBook, summary: newSummary, quiz: newQuiz };
  },

  // Dynamic Quiz Generator (Supports 5, 10, 15, 20 questions)
  async generateQuiz({ textbookId, summaryId, topic, subject, difficulty = "Intermediate", questionCount = 5, language = "en" }) {
    const totalQ = Math.max(3, Math.min(25, questionCount));
    const questionPool = [
      {
        q: "What is the primary role of system architecture boundaries in software engineering?",
        opts: ["To enforce modularity and loose coupling", "To increase memory latency", "To prevent code compilation", "To run multiple processes on a single thread"],
        correct: 0,
        exp: "Architecture boundaries isolate subsystems, guaranteeing loose coupling and high cohesion."
      },
      {
        q: "Which state transition occurs deterministically when a system receives a valid input packet?",
        opts: ["Halt state", "Active Processing State", "Undefined Trap", "Memory Flush State"],
        correct: 1,
        exp: "Valid input triggers active processing and state transition in standard deterministic machines."
      },
      {
        q: "What mechanism is utilized to prevent data corruption during simultaneous concurrent executions?",
        opts: ["Mutual Exclusion (Mutex) & Synchronization", "Uncontrolled Paging", "Random Cache Invalidation", "Infinite Polling Loop"],
        correct: 0,
        exp: "Mutex locks and synchronization semaphores preserve atomic access to shared state."
      },
      {
        q: "In mathematical performance evaluation, how is efficiency (η) accurately computed?",
        opts: ["η = Total Input - Residual Error", "η = (Useful Output / Total Energy Input) × 100%", "η = Round Trip Time × MSS", "η = Clock Cycles / Core Count"],
        correct: 1,
        exp: "Efficiency represents the percentage ratio of useful work done over total energy expended."
      },
      {
        q: "What is the key advantage of modular subroutines in large-scale system pipelines?",
        opts: ["Code reusability, testability, and isolated failure domains", "Guaranteed 100% CPU utilization", "Elimination of binary compilers", "Infinite network throughput"],
        correct: 0,
        exp: "Modularity isolates faults and enables independent component verification."
      },
      {
        q: "Which metric primarily determines the throughput capacity of a data pipeline?",
        opts: ["The slowest bottleneck stage", "The fastest processor clock", "Disk sector size", "Monitor refresh rate"],
        correct: 0,
        exp: "Overall pipeline throughput is constrained by the maximum latency of its slowest stage."
      },
      {
        q: "What occurs during an error detection checksum mismatch?",
        opts: ["Packet discard and retransmission request", "Immediate CPU power down", "System disk wipe", "Automatic speed increase"],
        correct: 0,
        exp: "Corrupted checksums trigger selective discard and protocol retransmission."
      },
      {
        q: "Why is data encapsulation essential for security and integrity?",
        opts: ["It hides internal state and restricts unauthorized direct manipulation", "It reduces file download sizes", "It compiles bytecode into machine code", "It translates text into audio"],
        correct: 0,
        exp: "Encapsulation prevents external bypass of internal invariant validations."
      },
      {
        q: "Which algorithm ensures equitable resource allocation without starvation?",
        opts: ["Round Robin & Fair Queuing", "First In Never Out", "Random Drop", "Shortest Job First only"],
        correct: 0,
        exp: "Round-robin scheduling grants bounded wait times to all active processes."
      },
      {
        q: "What is the primary benefit of exponential backoff during network congestion?",
        opts: ["Prevents packet collision storms by spacing retries", "Increases packet size", "Encrypts payloads", "Bypasses firewalls"],
        correct: 0,
        exp: "Exponential backoff allows congested channels time to clear before retrying."
      },
      {
        q: "What is the fundamental difference between synchronous and asynchronous operations?",
        opts: ["Synchronous blocks until completion; Asynchronous permits concurrent progress", "Asynchronous is always single-threaded", "Synchronous cannot handle integers", "There is no difference"],
        correct: 0,
        exp: "Synchronous calls block execution, while asynchronous models yield control."
      },
      {
        q: "How does caching improve overall response latency?",
        opts: ["Stores frequently accessed data in fast local memory", "Compresses audio files", "Increases network wire length", "Deletes obsolete records"],
        correct: 0,
        exp: "Caches eliminate expensive round-trip queries to backing storage."
      },
      {
        q: "What is the function of an idempotent API operation?",
        opts: ["Multiple identical requests produce the same outcome as a single request", "It can only run once in a lifetime", "It deletes database tables", "It generates random passwords"],
        correct: 0,
        exp: "Idempotence ensures safe retries without unintended side effects."
      },
      {
        q: "Which principle dictates that software entities should be open for extension but closed for modification?",
        opts: ["Open/Closed Principle (OCP)", "Single Responsibility", "Liskov Substitution", "Dependency Inversion"],
        correct: 0,
        exp: "OCP allows adding new functionality without altering existing tested code."
      },
      {
        q: "What is the primary purpose of database normalization?",
        opts: ["Eliminate redundant data and maintain referential integrity", "Increase duplicate rows", "Slow down SELECT queries", "Convert SQL to NoSQL"],
        correct: 0,
        exp: "Normalization organizes schemas to prevent update anomalies and storage waste."
      },
      {
        q: "In distributed consensus, what problem does the Raft or Paxos protocol solve?",
        opts: ["Agreement among multiple nodes in the presence of network partitions", "GPU overclocking", "Text-to-speech conversion", "Image compression"],
        correct: 0,
        exp: "Consensus algorithms ensure replicated state consistency across distributed clusters."
      },
      {
        q: "What does the ACID acronym stand for in transaction processing?",
        opts: ["Atomicity, Consistency, Isolation, Durability", "Accuracy, Control, Integration, Design", "Async, Concurrent, Indexed, Distributed", "None of the above"],
        correct: 0,
        exp: "ACID guarantees transactional correctness in relational databases."
      },
      {
        q: "How does virtual memory paging protect processes from interfering with each other?",
        opts: ["Provides each process an isolated virtual address space mapped to physical frames", "Encrypts all RAM chips with AES", "Runs each process on separate hardware", "Disables memory writes"],
        correct: 0,
        exp: "Virtual memory mapping isolates address spaces, preventing unauthorized memory access."
      },
      {
        q: "What is the role of a reverse proxy in web infrastructure?",
        opts: ["Load balancing, TLS termination, and request routing", "Client-side image editing", "Compiling JavaScript", "Generating passwords"],
        correct: 0,
        exp: "Reverse proxies manage upstream traffic distribution and SSL termination."
      },
      {
        q: "Why are cryptographic hash functions designed to be one-way?",
        opts: ["Computationally infeasible to derive the input from the hash digest", "To make files larger", "To double CPU clock speeds", "To allow easy decryption"],
        correct: 0,
        exp: "One-way hash functions secure passwords and ensure tamper-evident signatures."
      }
    ];

    // Pick exactly N questions
    const selectedQuestions = questionPool.slice(0, totalQ).map((item, idx) => ({
      id: `q-${Date.now()}-${idx + 1}`,
      question: item.q,
      options: item.opts,
      correctAnswer: item.correct,
      explanation: item.exp,
      topic: topic || "Core Fundamentals",
      difficulty: difficulty
    }));

    const quiz = {
      id: "quiz-" + Date.now(),
      textbookId: textbookId || "tb-1",
      summaryId: summaryId || null,
      title: `${topic || "Textbook"} AI Mastery Quiz`,
      topic: topic || "Core Fundamentals",
      subject: subject || "Engineering & Computer Science",
      difficulty: difficulty,
      timeLimitMinutes: Math.max(5, Math.ceil(totalQ * 1.5)),
      totalQuestions: selectedQuestions.length,
      questions: selectedQuestions
    };

    storageService.addQuiz(quiz);
    return quiz;
  },

  async getSummaries() {
    return storageService.getSummaries();
  },

  async getSummaryById(id) {
    return storageService.getSummaryById(id);
  },

  async translateSummary(summaryId, targetLang) {
    await sleep(400);
    const summary = storageService.getSummaryById(summaryId);
    const translation = MULTILINGUAL_SUMMARIES[targetLang] || MULTILINGUAL_SUMMARIES.en;

    return {
      status: "success",
      language: targetLang,
      translation: {
        summaryText: translation.summary,
        simpleExplanation: translation.simpleExplanation,
        keyPoints: translation.keyPoints
      }
    };
  },

  async submitQuiz(submission) {
    await sleep(500);
    const quiz = storageService.getQuizById(submission.quizId);
    if (!quiz) throw new Error("Quiz not found");
    
    let correctCount = 0;
    const reviewedAnswers = quiz.questions.map((q) => {
      const userSelected = submission.selectedAnswers[q.id];
      const isCorrect = userSelected === q.correctAnswer;
      if (isCorrect) correctCount += 1;

      return {
        questionId: q.id,
        question: q.question,
        userAnswerIndex: userSelected,
        userOption: q.options[userSelected] || "No answer chosen",
        correctAnswerIndex: q.correctAnswer,
        correctOption: q.options[q.correctAnswer],
        isCorrect,
        explanation: q.explanation,
        topic: q.topic
      };
    });

    const percentage = Math.round((correctCount / quiz.questions.length) * 100);
    let performanceLevel = "Weak";
    if (percentage >= 80) performanceLevel = "Strong";
    else if (percentage >= 65) performanceLevel = "Good";
    else if (percentage >= 50) performanceLevel = "Needs Improvement";

    const result = {
      id: "attempt-" + Date.now(),
      quizId: quiz.id,
      quizTitle: quiz.title,
      topic: quiz.topic,
      subject: quiz.subject,
      score: correctCount,
      totalQuestions: quiz.questions.length,
      percentage,
      performanceLevel,
      timeSpentSeconds: submission.timeSpentSeconds || 180,
      submittedAt: new Date().toISOString(),
      answers: reviewedAnswers,
      recommendedTopic: percentage < 65 ? quiz.topic : "Next Advanced Chapter",
      recommendationDifficulty: percentage < 50 ? "Beginner" : percentage < 75 ? "Intermediate" : "Advanced"
    };

    storageService.saveQuizAttempt(result);
    return result;
  },

  async getRecommendations() {
    await sleep(200);
    return storageService.getRecommendations();
  },

  async getAnalytics() {
    await sleep(200);
    const user = storageService.getUser() || storageService.initNewUser();
    const attempts = storageService.getQuizAttempts();
    const textbooks = storageService.getTextbooks();
    const summaries = storageService.getSummaries();
    const subjects = storageService.getSubjectProgress();

    return {
      user,
      stats: {
        booksStudied: textbooks.length,
        summariesGenerated: summaries.length,
        quizzesCompleted: user.quizzesTaken || 0,
        averageScore: user.averageScore || 0,
        streakDays: user.streakDays || 0,
        totalStudyHours: user.totalStudyHours || 0
      },
      subjectProgress: subjects,
      quizHistory: attempts
    };
  }
};
