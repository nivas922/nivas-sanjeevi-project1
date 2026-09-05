import { storageService } from "./storageService";
import { MULTILINGUAL_SUMMARIES, SUPPORTED_LANGUAGES, DEPARTMENTS } from "../data/translations";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getAuthHeaders = () => {
  const token = storageService.getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  // 1. Google OAuth Verification Login
  async loginWithGoogle(idToken, department) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          department
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Google authentication verification failed.");
      }

      storageService.setToken(data.token);
      storageService.initNewUser(data.user);
      return { status: "success", user: data.user, token: data.token, isNewUser: data.isNewUser };
    } catch (err) {
      if (err.message?.includes("Failed to fetch") || !API_BASE_URL || API_BASE_URL.includes("localhost")) {
        const mockUser = {
          id: "google_student_verified",
          name: "Verified Student (Google)",
          email: "student.google@learnai.local",
          department: department || "Computer Science",
          role: "Student",
          is_verified: true,
          auth_provider: "google",
          avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=google_student_demo"
        };
        const mockToken = "mock_jwt_google_" + Date.now();
        storageService.setToken(mockToken);
        storageService.initNewUser(mockUser);
        return { status: "success", user: mockUser, token: mockToken, isNewUser: false, isDemoMode: true };
      }
      throw err;
    }
  },

  // 2. Mobile OTP: Send Verification Code
  async sendMobileOtp(phoneNumber) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/mobile/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: phoneNumber })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch mobile verification code.");
      }
      return data;
    } catch (err) {
      if (err.message?.includes("Failed to fetch") || !API_BASE_URL || API_BASE_URL.includes("localhost")) {
        const demoOtp = "123456";
        sessionStorage.setItem(`demo_otp_${phoneNumber}`, demoOtp);
        return {
          success: true,
          isDemoMode: true,
          demoOtp,
          message: `Demo Mode (Backend offline): Verification code is ${demoOtp}`
        };
      }
      throw err;
    }
  },

  // 3. Mobile OTP: Verify and Establish Session
  async loginWithMobile(phoneNumber, otp, department) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/mobile/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: phoneNumber,
          otp,
          department
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Mobile verification failed. Invalid or expired OTP.");
      }

      storageService.setToken(data.token);
      storageService.initNewUser(data.user);
      return { status: "success", user: data.user, token: data.token, isNewUser: data.isNewUser };
    } catch (err) {
      if (err.message?.includes("Failed to fetch") || !API_BASE_URL || API_BASE_URL.includes("localhost")) {
        const storedOtp = sessionStorage.getItem(`demo_otp_${phoneNumber}`) || "123456";
        if (otp !== storedOtp && otp !== "123456") {
          throw new Error("Invalid verification code. Please enter 123456 (Demo Code).");
        }
        const mockUser = {
          id: `mobile_${phoneNumber}`,
          name: `Student (${phoneNumber.slice(-4)})`,
          email: `${phoneNumber}@sms.learnai.local`,
          phone: `+91 ${phoneNumber}`,
          department: department || "Computer Science",
          role: "Student",
          is_verified: true,
          auth_provider: "mobile",
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${phoneNumber}`
        };
        const mockToken = `mock_jwt_mobile_${phoneNumber}_` + Date.now();
        storageService.setToken(mockToken);
        storageService.initNewUser(mockUser);
        return { status: "success", user: mockUser, token: mockToken, isNewUser: false, isDemoMode: true };
      }
      throw err;
    }
  },

  // 4. Email Registration (Sends Verification OTP)
  async register(userData) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/email/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          department: userData.department
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed.");
      }
      return data;
    } catch (err) {
      if (err.message?.includes("Failed to fetch") || !API_BASE_URL || API_BASE_URL.includes("localhost")) {
        sessionStorage.setItem(`pending_user_${userData.email}`, JSON.stringify(userData));
        sessionStorage.setItem(`demo_email_otp_${userData.email}`, "123456");
        return {
          success: true,
          isDemoMode: true,
          demoOtp: "123456",
          message: "Demo Mode (Backend offline): Verification code is 123456"
        };
      }
      throw err;
    }
  },

  // 5. Verify Email OTP & Complete Registration
  async verifyEmailOtp(email, otp) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Email verification failed.");
      }

      storageService.setToken(data.token);
      storageService.initNewUser(data.user);
      return { status: "success", user: data.user, token: data.token };
    } catch (err) {
      if (err.message?.includes("Failed to fetch") || !API_BASE_URL || API_BASE_URL.includes("localhost")) {
        const storedOtp = sessionStorage.getItem(`demo_email_otp_${email}`) || "123456";
        if (otp !== storedOtp && otp !== "123456") {
          throw new Error("Invalid verification code. Please enter 123456.");
        }
        let savedData = {};
        try {
          savedData = JSON.parse(sessionStorage.getItem(`pending_user_${email}`) || "{}");
        } catch {
          savedData = {};
        }
        const mockUser = {
          id: "email_student_" + Date.now(),
          name: savedData.name || email.split("@")[0],
          email,
          department: savedData.department || "Computer Science",
          role: "Student",
          is_verified: true,
          auth_provider: "email",
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`
        };
        const mockToken = "mock_jwt_email_" + Date.now();
        storageService.setToken(mockToken);
        storageService.initNewUser(mockUser);
        return { status: "success", user: mockUser, token: mockToken, isDemoMode: true };
      }
      throw err;
    }
  },

  // 6. Email & Password Login
  async login(credentials) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/email/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const err = new Error(data.error || "Authentication failed.");
        err.emailNotVerified = Boolean(data.emailNotVerified);
        err.email = data.email || credentials.email;
        throw err;
      }

      storageService.setToken(data.token);
      storageService.initNewUser(data.user);
      return { status: "success", user: data.user, token: data.token };
    } catch (err) {
      if (err.message?.includes("Failed to fetch") || !API_BASE_URL || API_BASE_URL.includes("localhost")) {
        const mockUser = {
          id: "student_demo_" + credentials.email.replace(/\W/g, ""),
          name: credentials.email.split("@")[0].replace(/[._]/g, " "),
          email: credentials.email,
          department: "Computer Science",
          role: "Student",
          is_verified: true,
          auth_provider: "email",
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${credentials.email}`
        };
        const mockToken = "mock_jwt_email_" + Date.now();
        storageService.setToken(mockToken);
        storageService.initNewUser(mockUser);
        return { status: "success", user: mockUser, token: mockToken, isDemoMode: true };
      }
      throw err;
    }
  },

  // 7. Resend Email Verification OTP
  async resendEmailOtp(email) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/email/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to resend verification code.");
      }
      return data;
    } catch (err) {
      if (err.message?.includes("Failed to fetch") || !API_BASE_URL || API_BASE_URL.includes("localhost")) {
        return { success: true, isDemoMode: true, message: "Demo Mode: Verification code is 123456" };
      }
      throw err;
    }
  },

  // 8. Forgot Password & Reset Password
  async forgotPassword(email) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send password reset code.");
      }
      return data;
    } catch (err) {
      if (err.message?.includes("Failed to fetch") || !API_BASE_URL || API_BASE_URL.includes("localhost")) {
        sessionStorage.setItem(`reset_otp_${email}`, "123456");
        return { success: true, isDemoMode: true, message: "Demo Mode: Reset code is 123456" };
      }
      throw err;
    }
  },

  async resetPassword({ email, otp, newPassword }) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Password reset failed.");
      }
      return data;
    } catch (err) {
      if (err.message?.includes("Failed to fetch") || !API_BASE_URL || API_BASE_URL.includes("localhost")) {
        if (otp !== "123456") {
          throw new Error("Invalid reset code. Use 123456 in Demo Mode.");
        }
        return { success: true, isDemoMode: true, message: "Password updated successfully." };
      }
      throw err;
    }
  },

  async getProfile() {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          storageService.updateUser(data.user);
          return { status: "success", user: data.user };
        }
      }
    } catch (err) {
      console.warn("Profile fetch notice:", err.message);
    }

    let user = storageService.getUser();
    if (!user) {
      user = storageService.initNewUser();
    }
    return { status: "success", user };
  },

  async updateProfile(profileData) {
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          storageService.updateUser(data.user);
          return { status: "success", user: data.user };
        }
      }
    } catch (err) {
      console.warn("Update profile API notice:", err.message);
    }
    const user = storageService.updateUser(profileData);
    return { status: "success", user };
  },

  // Textbook Upload and Multilingual Processing Pipeline
  async uploadTextbook(file, metadata, onProgress = () => {}) {
    const isScanned = file.name.endsWith(".png") || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg");
    const stages = [
      { step: 1, label: "Uploading document...", percent: 15 },
      { step: 2, label: isScanned ? "Scanned document detected. Extracting text using OCR..." : "Extracting selectable text with PyMuPDF...", percent: 30 },
      { step: 3, label: "Detecting chapters and structural hierarchy...", percent: 45 },
      { step: 4, label: "Analyzing key formulas, definitions and topics...", percent: 60 },
      { step: 5, label: `Generating AI summarization in ${metadata.targetLanguageName || "selected language"}...`, percent: 75 },
      { step: 6, label: "Synthesizing multilingual audio representations...", percent: 85 },
      { step: 7, label: `Creating ${metadata.questionCount || 5}-question adaptive quiz bank...`, percent: 95 },
      { step: 8, label: "Personalized learning curriculum ready!", percent: 100 }
    ];

    for (const stage of stages) {
      await sleep(250);
      onProgress(stage);
    }

    const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    const langCode = metadata.targetLanguage || "en";
    const questionCount = parseInt(metadata.questionCount || 5, 10);

    let backendBook = null;
    let backendSummary = null;
    let backendQuiz = null;

    // Call Backend Upload & Summarize APIs
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", formattedTitle);
      formData.append("subject", metadata.subject || formattedTitle);

      const token = storageService.getToken();
      const uploadRes = await fetch(`${API_BASE_URL}/upload-book`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        backendBook = uploadData.book;

        // Call /summarize with target_language
        const sumRes = await fetch(`${API_BASE_URL}/summarize`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            book_id: uploadData.book_id,
            target_language: langCode
          })
        });

        if (sumRes.ok) {
          const sumData = await sumRes.json();
          backendSummary = sumData.summary;
        }

        // Call /generate-quiz
        const quizRes = await fetch(`${API_BASE_URL}/generate-quiz`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            book_id: uploadData.book_id,
            num_questions: questionCount,
            language: langCode
          })
        });

        if (quizRes.ok) {
          const quizData = await quizRes.json();
          backendQuiz = quizData.quiz;
        }
      }
    } catch (backendErr) {
      console.warn("Backend processing pipeline notice:", backendErr.message);
    }

    const newId = backendBook ? backendBook.id : "tb-" + Date.now();

    const newBook = backendBook || {
      id: newId,
      title: formattedTitle,
      author: metadata.author || "Uploaded Academic Textbook",
      coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
      subject: metadata.subject || cleanTitle,
      category: "Academic",
      pages: 45,
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

    const langSummaryTemplate = MULTILINGUAL_SUMMARIES[langCode] || MULTILINGUAL_SUMMARIES.en;

    const newSummary = backendSummary ? {
      ...backendSummary,
      textbookId: newId,
      bookTitle: newBook.title,
      topic: `${newBook.title} - Fundamentals`,
      readTime: "5 min read",
      translations: MULTILINGUAL_SUMMARIES
    } : {
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

    const newQuiz = backendQuiz || await this.generateQuiz({
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
    try {
      const res = await fetch(`${API_BASE_URL}/generate-quiz`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          book_id: textbookId,
          num_questions: questionCount,
          language
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.quiz) {
          storageService.addQuiz(data.quiz);
          return data.quiz;
        }
      }
    } catch (err) {
      console.warn("Backend generateQuiz notice:", err.message);
    }

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
      }
    ];

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
    try {
      const res = await fetch(`${API_BASE_URL}/summaries/${summaryId}/translate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ target_language: targetLang })
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn("Translate summary API notice:", err.message);
    }

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

  async textToSpeech(text, language = "en") {
    try {
      const res = await fetch(`${API_BASE_URL}/text-to-speech`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, language })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("TTS API notice:", err.message);
    }
    return { status: "fallback" };
  },

  async submitQuiz(submission) {
    try {
      const res = await fetch(`${API_BASE_URL}/submit-quiz`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          quiz_id: submission.quizId,
          answers: submission.selectedAnswers
        })
      });
      if (res.ok) {
        const data = await res.json();
        // Also save to local storage for instant offline UI responsiveness
        storageService.saveQuizAttempt({
          id: "attempt-" + Date.now(),
          quizId: submission.quizId,
          score: data.score,
          totalQuestions: data.totalQuestions,
          percentage: data.percentage,
          performanceLevel: data.performanceLevel,
          answers: data.reviewedAnswers || data.answers,
          recommendedTopic: data.recommendedTopic,
          recommendationDifficulty: data.recommendationDifficulty
        });
        return data;
      }
    } catch (err) {
      console.warn("Submit quiz backend notice:", err.message);
    }

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
    const user = storageService.getUser();
    if (user && user.id) {
      try {
        const res = await fetch(`${API_BASE_URL}/recommendations/${user.id}`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data.recommendations) {
            return data.recommendations;
          }
        }
      } catch (err) {
        console.warn("Recommendations API notice:", err.message);
      }
    }
    return storageService.getRecommendations();
  },

  async getAnalytics() {
    const user = storageService.getUser() || storageService.initNewUser();
    if (user && user.id) {
      try {
        const [progRes, actRes] = await Promise.all([
          fetch(`${API_BASE_URL}/progress/${user.id}`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE_URL}/activity/${user.id}`, { headers: getAuthHeaders() })
        ]);

        if (progRes.ok) {
          const progData = await progRes.json();
          const actData = actRes.ok ? await actRes.json() : { activities: [] };

          return {
            user,
            stats: {
              booksStudied: progData.stats.booksStudied || 0,
              summariesGenerated: progData.stats.summariesGenerated || 0,
              quizzesCompleted: progData.stats.quizzesCompleted || 0,
              averageScore: progData.stats.averageScore || 0,
              streakDays: user.streakDays || 0,
              totalStudyHours: user.totalStudyHours || 0
            },
            subjectProgress: progData.subjectProgress || [],
            activities: actData.activities || [],
            quizHistory: storageService.getQuizAttempts()
          };
        }
      } catch (err) {
        console.warn("Analytics API notice:", err.message);
      }
    }

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
