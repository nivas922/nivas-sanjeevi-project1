import { storageService } from "./storageService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // Authentication
  async register(userData) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    await sleep(600);
    const user = storageService.updateUser({
      name: userData.name,
      email: userData.email
    });
    storageService.setToken("demo_token_" + Date.now());
    return { status: "success", user, token: "demo_token_" + Date.now() };
  },

  async login(credentials) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    await sleep(600);
    const user = storageService.getUser();
    storageService.setToken("demo_token_" + Date.now());
    return { status: "success", user, token: "demo_token_" + Date.now() };
  },

  async getProfile() {
    try {
      const token = storageService.getToken();
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { status: "success", user: storageService.getUser() };
  },

  // Textbook Upload and Processing
  async uploadTextbook(file, metadata, onProgress = () => {}) {
    // 8 stages progression callback
    const stages = [
      { step: 1, label: "Uploading document...", percent: 15 },
      { step: 2, label: file.name.endsWith(".png") || file.name.endsWith(".jpg") ? "Scanned image detected. Extracting text using OCR..." : "Extracting selectable text with PyMuPDF...", percent: 30 },
      { step: 3, label: "Detecting chapters and structure...", percent: 45 },
      { step: 4, label: "Analyzing key topics and formulas...", percent: 60 },
      { step: 5, label: "Generating AI summarization...", percent: 75 },
      { step: 6, label: "Synthesizing multilingual representations...", percent: 85 },
      { step: 7, label: "Creating adaptive quiz bank...", percent: 95 },
      { step: 8, label: "Personalized learning plan ready!", percent: 100 }
    ];

    for (const stage of stages) {
      await sleep(500);
      onProgress(stage);
    }

    const newId = "tb-" + Date.now();
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    const newBook = {
      id: newId,
      title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
      author: metadata.author || "Uploaded Textbook",
      coverUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&auto=format&fit=crop&q=80",
      subject: metadata.subject || "General Engineering",
      category: "Custom Textbook",
      pages: Math.floor(Math.random() * 150) + 40,
      chaptersCount: 4,
      progress: 0,
      status: "In Progress",
      lastStudied: "Just now",
      topics: [
        { id: `top-${newId}-1`, name: "Core Principles & Architecture", mastery: 50, status: "Needs Improvement" },
        { id: `top-${newId}-2`, name: "Key Protocols & Algorithms", mastery: 40, status: "Weak" },
      ],
      chapters: [
        { id: `ch-${newId}-1`, number: 1, title: "Overview and Fundamental Concepts", pages: 25 },
        { id: `ch-${newId}-2`, number: 2, title: "Deep Dive: Core Methodology", pages: 35 },
      ]
    };

    storageService.addTextbook(newBook);

    // Auto-generate initial summary for chapter 1
    const newSummary = {
      id: "sum-" + Date.now(),
      textbookId: newId,
      bookTitle: newBook.title,
      chapterId: `ch-${newId}-1`,
      chapterTitle: "Chapter 1: Overview and Fundamental Concepts",
      topic: `${newBook.title} - Core Fundamentals`,
      difficulty: metadata.difficulty || "Intermediate",
      length: metadata.summaryLength || "Detailed",
      createdDate: new Date().toISOString().split("T")[0],
      readTime: "5 min read",
      summaryText: `This chapter establishes the foundational principles of ${newBook.title}. It systematically introduces standard terminologies, functional workflows, component interactions, and performance benchmarks. Students learn the conceptual pipeline, underlying mathematical abstractions, and real-world system implementations.`,
      simpleExplanation: `Think of this topic as the blueprint of a building. Before constructing individual rooms (advanced topics), we need a solid foundation and structural beams (fundamentals) to keep everything sturdy!`,
      keyConcepts: [
        `Architectural components of ${newBook.title}`,
        "Standard execution pipelines and workflow diagrams",
        "Error handling, synchronization, and efficiency trade-offs",
        "Integration with modern distributed infrastructure"
      ],
      keyPoints: [
        "Provides the baseline framework used across all subsequent chapters.",
        "Reduces computational overhead through modular subroutines.",
        "Emphasizes clean abstraction boundaries and deterministic state transitions."
      ],
      definitions: [
        {
          term: "Primary Framework",
          definition: "The core structural paradigm governing how data and control flow through the system."
        },
        {
          term: "State Transition",
          definition: "The deterministic progression from one computational state to another upon processing an event."
        }
      ],
      formulas: [
        {
          name: "Efficiency Metric (η)",
          formula: "η = (Useful Output Work / Total Energy Input) × 100%",
          description: "Calculates the operational efficiency ratio."
        }
      ],
      examples: [
        {
          title: "Basic Implementation Pattern",
          code: `def execute_pipeline(input_stream):
    validated = validate_input(input_stream)
    processed = transform_data(validated)
    return emit_result(processed)`
        }
      ],
      quickRevision: [
        "Understand the 3 core pillars of the chapter.",
        "Review state transition tables before the test.",
        "Focus on system boundary constraints."
      ],
      translations: {
        ta: {
          summaryText: `${newBook.title} பாடப்புத்தகத்தின் அடிப்படை கருத்துக்கள் மற்றும் கட்டமைப்பு தத்துவங்களை இந்த அத்தியாயம் விளக்குகிறது.`,
          simpleExplanation: "ஒரு கட்டிடத்தை கட்டுவதற்கு அடித்தளம் எவ்வளவு முக்கியமோ, அதே போல அடுத்தடுத்த பாடங்களை கற்க இந்த அத்தியாயம் அடிப்படையாகும்.",
          keyPoints: ["அடிப்படை கட்டமைப்பு விதிகளை விளக்குகிறது.", "செயல்திறன் மற்றும் துல்லியத்தை மேம்படுத்துகிறது."]
        },
        hi: {
          summaryText: `यह अध्याय ${newBook.title} के मौलिक सिद्धांतों और कार्यप्रणाली का विस्तृत विवरण प्रस्तुत करता है।`,
          simpleExplanation: "यह विषय एक इमारत की नींव जैसा है जो आगे के उन्नत विषयों को सहारा देने के लिए आवश्यक है।",
          keyPoints: ["प्रणाली के मुख्य घटकों को समझाता है।", "दक्षता और विश्वसनीयता में सुधार करता है।"]
        }
      }
    };

    storageService.addSummary(newSummary);

    return { status: "success", textbook: newBook, summary: newSummary };
  },

  // Summaries
  async getSummaries() {
    return storageService.getSummaries();
  },

  async getSummaryById(id) {
    return storageService.getSummaryById(id);
  },

  async translateSummary(summaryId, targetLang) {
    await sleep(600);
    const summary = storageService.getSummaryById(summaryId);
    if (!summary) throw new Error("Summary not found");

    if (summary.translations && summary.translations[targetLang]) {
      return {
        status: "success",
        language: targetLang,
        translation: summary.translations[targetLang]
      };
    }

    // Dynamic mock translation fallback for other languages
    const langNames = {
      ta: "Tamil", hi: "Hindi", te: "Telugu",
      kn: "Kannada", ml: "Malayalam", bn: "Bengali"
    };

    return {
      status: "success",
      language: targetLang,
      translation: {
        summaryText: `[Translated to ${langNames[targetLang] || targetLang}]: ${summary.summaryText}`,
        simpleExplanation: `[${langNames[targetLang] || targetLang} Explanation]: ${summary.simpleExplanation}`,
        keyPoints: summary.keyPoints.map(p => `[${targetLang.toUpperCase()}] ${p}`)
      }
    };
  },

  async simplifySummary(summaryId) {
    await sleep(400);
    const summary = storageService.getSummaryById(summaryId);
    return {
      status: "success",
      original: summary.summaryText,
      simplified: summary.simpleExplanation
    };
  },

  // Quizzes & Adaptive Learning
  async getQuizzes() {
    return storageService.getQuizzes();
  },

  async getQuizById(id) {
    return storageService.getQuizById(id);
  },

  async submitQuiz(submission) {
    await sleep(700);
    const quiz = storageService.getQuizById(submission.quizId);
    
    let correctCount = 0;
    const reviewedAnswers = quiz.questions.map((q, idx) => {
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

  // Recommendations and Analytics
  async getRecommendations() {
    await sleep(300);
    return storageService.getRecommendations();
  },

  async getAnalytics() {
    await sleep(300);
    const user = storageService.getUser();
    const attempts = storageService.getQuizAttempts();
    const textbooks = storageService.getTextbooks();
    const summaries = storageService.getSummaries();
    const subjects = storageService.getSubjectProgress();

    return {
      user,
      stats: {
        booksStudied: textbooks.length,
        summariesGenerated: summaries.length,
        quizzesCompleted: user.quizzesTaken,
        averageScore: user.averageScore,
        streakDays: user.streakDays,
        totalStudyHours: user.totalStudyHours
      },
      subjectProgress: subjects,
      quizHistory: attempts,
      strongTopics: [
        { name: "Python OOP & Classes", score: 92, subject: "Python" },
        { name: "Relational Algebra & SQL", score: 85, subject: "DBMS" },
        { name: "CPU Scheduling Algorithms", score: 82, subject: "OS" }
      ],
      weakTopics: [
        { name: "TCP/IP Protocol Suite", score: 45, subject: "Computer Networks", status: "Critical" },
        { name: "Subnetting & CIDR Calculation", score: 50, subject: "Computer Networks", status: "Needs Review" },
        { name: "Process Synchronization & Semaphores", score: 60, subject: "OS", status: "Needs Practice" }
      ]
    };
  }
};
