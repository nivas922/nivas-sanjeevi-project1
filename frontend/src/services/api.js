import { storageService } from "./storageService.js";
import { SUPPORTED_LANGUAGES, DEPARTMENTS } from "../data/translations.js";

const API_BASE_URL = import.meta.env?.VITE_API_URL || "/api";
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getAuthHeaders = () => {
  const token = storageService.getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

/**
 * Robust HTTP Response Validator & Error Extractor
 * Handles 400, 401, 403, 404, 409, 422, 429, 500, 503, 530 transparently.
 */
export const handleApiResponse = async (res) => {
  if (res.ok) {
    return await res.json();
  }

  let errorData = null;
  try {
    errorData = await res.json();
  } catch {
    errorData = null;
  }

  const backendMessage = errorData?.error || errorData?.message;

  // 401 Unauthorized: clear authentication state immediately
  if (res.status === 401) {
    storageService.removeToken();
    const err = new Error(backendMessage || "Your session has expired. Please sign in again.");
    err.status = 401;
    throw err;
  }

  // 403 Forbidden
  if (res.status === 403) {
    const err = new Error(backendMessage || "You do not have permission to perform this action.");
    err.status = 403;
    throw err;
  }

  // 404 Not Found
  if (res.status === 404) {
    const err = new Error(backendMessage || "The requested resource was not found.");
    err.status = 404;
    throw err;
  }

  // 400 Bad Request
  if (res.status === 400) {
    const err = new Error(backendMessage || "Invalid request. Please check your input.");
    err.status = 400;
    throw err;
  }

  // 409 Conflict
  if (res.status === 409) {
    const err = new Error(backendMessage || "A conflict occurred with this resource.");
    err.status = 409;
    throw err;
  }

  // 422 Unprocessable Entity
  if (res.status === 422) {
    const err = new Error(backendMessage || "The provided data could not be processed.");
    err.status = 422;
    throw err;
  }

  // 429 Too Many Requests
  if (res.status === 429) {
    const err = new Error(backendMessage || "Too many requests. Please wait a moment and try again.");
    err.status = 429;
    throw err;
  }

  // 503 Service Unavailable / 530
  if (res.status === 503 || res.status === 530) {
    const err = new Error(backendMessage || "The AI service is currently unavailable. Please try again later.");
    err.status = res.status;
    throw err;
  }

  // 500 Internal Server Error & general 5xx
  if (res.status >= 500) {
    const err = new Error(backendMessage || "The server encountered an error. Please try again.");
    err.status = res.status;
    throw err;
  }

  const err = new Error(backendMessage || `Request failed with status ${res.status}.`);
  err.status = res.status;
  throw err;
};

/**
 * Network and connectivity failure handler
 */
export const handleNetworkError = (err) => {
  if (err.status) {
    throw err;
  }

  console.error("Network or API communication failure:", err);
  const isNetworkFailure =
    err.name === "TypeError" ||
    err.message?.includes("Failed to fetch") ||
    err.message?.includes("NetworkError") ||
    err.message?.includes("connection refused") ||
    err.message?.includes("timeout");

  if (isNetworkFailure) {
    const netErr = new Error("Unable to connect to the backend server. Please check your connection and try again.");
    netErr.isNetworkError = true;
    throw netErr;
  }

  throw err;
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
      const data = await handleApiResponse(res);
      storageService.setToken(data.token);
      storageService.initNewUser(data.user);
      return { status: "success", user: data.user, token: data.token, isNewUser: data.isNewUser };
    } catch (err) {
      handleNetworkError(err);
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
      return await handleApiResponse(res);
    } catch (err) {
      handleNetworkError(err);
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
      const data = await handleApiResponse(res);
      storageService.setToken(data.token);
      storageService.initNewUser(data.user);
      return { status: "success", user: data.user, token: data.token, isNewUser: data.isNewUser };
    } catch (err) {
      handleNetworkError(err);
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
      return await handleApiResponse(res);
    } catch (err) {
      handleNetworkError(err);
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
      const data = await handleApiResponse(res);
      storageService.setToken(data.token);
      storageService.initNewUser(data.user);
      return { status: "success", user: data.user, token: data.token };
    } catch (err) {
      handleNetworkError(err);
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
      const data = await handleApiResponse(res);
      storageService.setToken(data.token);
      storageService.initNewUser(data.user);
      return { status: "success", user: data.user, token: data.token };
    } catch (err) {
      handleNetworkError(err);
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
      return await handleApiResponse(res);
    } catch (err) {
      handleNetworkError(err);
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
      return await handleApiResponse(res);
    } catch (err) {
      handleNetworkError(err);
    }
  },

  async resetPassword({ email, otp, newPassword }) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });
      return await handleApiResponse(res);
    } catch (err) {
      handleNetworkError(err);
    }
  },

  async getProfile() {
    const token = storageService.getToken();
    if (!token) {
      return null;
    }

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
      } else if (res.status === 401) {
        storageService.removeToken();
        return null;
      }
    } catch (err) {
      console.warn("Profile fetch notice:", err.message);
    }

    const user = storageService.getUser();
    return user ? { status: "success", user } : null;
  },

  async updateProfile(profileData) {
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      const data = await handleApiResponse(res);
      if (data.user) {
        storageService.updateUser(data.user);
        return { status: "success", user: data.user };
      }
    } catch (err) {
      handleNetworkError(err);
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
      await sleep(150);
      onProgress(stage);
    }

    const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    const langCode = metadata.targetLanguage || "en";
    const questionCount = parseInt(metadata.questionCount || 5, 10);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", formattedTitle);
    formData.append("subject", metadata.subject || formattedTitle);

    const token = storageService.getToken();

    // 1. Upload textbook to backend
    let uploadData;
    try {
      const uploadRes = await fetch(`${API_BASE_URL}/upload-book`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      uploadData = await handleApiResponse(uploadRes);
    } catch (err) {
      handleNetworkError(err);
    }

    if (!uploadData || !uploadData.book) {
      throw new Error("Textbook upload failed: server did not return book information.");
    }

    const backendBook = uploadData.book;
    const bookId = uploadData.book_id || backendBook.id;

    // 2. Call /summarize with target_language
    let sumData;
    try {
      const sumRes = await fetch(`${API_BASE_URL}/summarize`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          book_id: bookId,
          target_language: langCode
        })
      });
      sumData = await handleApiResponse(sumRes);
    } catch (err) {
      handleNetworkError(err);
    }

    if (!sumData || !sumData.summary) {
      throw new Error("AI summarization failed: server did not return summary.");
    }

    const backendSummary = sumData.summary;

    // 3. Call /generate-quiz
    let backendQuiz = null;
    try {
      const quizRes = await fetch(`${API_BASE_URL}/generate-quiz`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          book_id: bookId,
          num_questions: questionCount,
          language: langCode
        })
      });
      if (quizRes.ok) {
        const quizData = await quizRes.json();
        backendQuiz = quizData.quiz;
        if (backendQuiz) {
          storageService.addQuiz(backendQuiz);
        }
      }
    } catch (quizErr) {
      console.warn("Quiz generation notice:", quizErr.message);
    }

    // Save genuine backend artifacts to storageService ONLY on success:
    storageService.addTextbook(backendBook);
    storageService.addSummary(backendSummary);

    return {
      status: "success",
      textbook: backendBook,
      summary: backendSummary,
      quiz: backendQuiz
    };
  },

  // AI Summarization
  async summarize({ bookId, targetLanguage = "en" }) {
    try {
      const res = await fetch(`${API_BASE_URL}/summarize`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          book_id: bookId,
          target_language: targetLanguage
        })
      });
      const data = await handleApiResponse(res);
      if (!data || !data.summary) {
        throw new Error("Summarization failed: server did not return summary.");
      }
      storageService.addSummary(data.summary);
      return data.summary;
    } catch (err) {
      handleNetworkError(err);
    }
  },

  // Dynamic Quiz Generator (Supports 5, 10, 15, 20 questions)
  async generateQuiz({ textbookId, bookId, book_id, summaryId, topic, subject, difficulty = "Intermediate", questionCount = 5, language = "en" }) {
    try {
      const targetBookId = textbookId || bookId || book_id;
      const res = await fetch(`${API_BASE_URL}/generate-quiz`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          book_id: targetBookId,
          num_questions: questionCount,
          difficulty,
          language
        })
      });
      const data = await handleApiResponse(res);
      if (data.quiz) {
        storageService.addQuiz(data.quiz);
        return data.quiz;
      }
      throw new Error("Server did not return a valid quiz.");
    } catch (err) {
      handleNetworkError(err);
    }
  },

  async getQuizzes() {
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.quizzes)) {
          return data.quizzes;
        }
      } else if (res.status === 401) {
        storageService.removeToken();
        throw new Error("Your session has expired. Please sign in again.");
      }
    } catch (err) {
      if (err.status === 401) throw err;
      console.warn("Backend getQuizzes notice:", err.message);
    }
    return storageService.getQuizzes();
  },

  async getQuizById(id) {
    if (!id) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/${id}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.quiz) {
          return data.quiz;
        }
      } else if (res.status === 401) {
        storageService.removeToken();
        throw new Error("Your session has expired. Please sign in again.");
      } else if (res.status === 404) {
        return null;
      }
    } catch (err) {
      if (err.status === 401) throw err;
      console.warn("Backend getQuizById notice:", err.message);
    }
    return storageService.getQuizzes().find((q) => q.id === id) || null;
  },

  async getSummaries() {
    try {
      const res = await fetch(`${API_BASE_URL}/summaries`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.summaries)) {
          return data.summaries;
        }
      } else if (res.status === 401) {
        storageService.removeToken();
        throw new Error("Your session has expired. Please sign in again.");
      }
    } catch (err) {
      if (err.status === 401) throw err;
      console.warn("Backend getSummaries notice:", err.message);
    }
    return storageService.getSummaries();
  },

  async getSummaryById(id) {
    if (!id) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/summaries/${id}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          return data.summary;
        }
      } else if (res.status === 401) {
        storageService.removeToken();
        throw new Error("Your session has expired. Please sign in again.");
      } else if (res.status === 404) {
        return null;
      }
    } catch (err) {
      if (err.status === 401) throw err;
      console.warn("Backend getSummaryById notice:", err.message);
    }
    return storageService.getSummaryById(id);
  },

  async translateSummary(summaryId, targetLang) {
    try {
      const res = await fetch(`${API_BASE_URL}/summaries/${summaryId}/translate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ target_language: targetLang })
      });
      return await handleApiResponse(res);
    } catch (err) {
      handleNetworkError(err);
    }
  },

  async textToSpeech(text, language = "en") {
    try {
      const res = await fetch(`${API_BASE_URL}/text-to-speech`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, language })
      });
      return await handleApiResponse(res);
    } catch (err) {
      handleNetworkError(err);
    }
  },

  // Real AI Academic Doubt Solver
  async askDoubt({ bookId, question, language = "en" }) {
    try {
      const res = await fetch(`${API_BASE_URL}/ask-doubt`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          bookId,
          question,
          language
        })
      });
      return await handleApiResponse(res);
    } catch (err) {
      handleNetworkError(err);
    }
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
      const data = await handleApiResponse(res);
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
    } catch (err) {
      handleNetworkError(err);
    }
  },

  async getRecommendations(bookId = null) {
    const user = storageService.getUser();
    if (user && user.id) {
      try {
        const query = bookId ? `?bookId=${encodeURIComponent(bookId)}` : "";
        const res = await fetch(`${API_BASE_URL}/recommendations/${user.id}${query}`, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.recommendations)) {
            return data.recommendations;
          }
        } else if (res.status === 401) {
          storageService.removeToken();
          throw new Error("Your session has expired. Please sign in again.");
        }
      } catch (err) {
        if (err.status === 401) throw err;
        console.warn("Recommendations API notice:", err.message);
        throw err;
      }
    }
    return [];
  },

  async getAdaptiveLearning(bookId = null) {
    try {
      const path = bookId ? `/adaptive-learning/${encodeURIComponent(bookId)}` : `/adaptive-learning`;
      const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      } else if (res.status === 401) {
        storageService.removeToken();
        throw new Error("Your session has expired. Please sign in again.");
      }
      const data = await res.json();
      throw new Error(data.error || "Failed to fetch adaptive learning data.");
    } catch (err) {
      if (err.status === 401) throw err;
      console.warn("Adaptive learning API notice:", err.message);
      throw err;
    }
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
          const realQuizHistory = progData.quizHistory || progData.quiz_history || [];

          return {
            user,
            stats: {
              booksStudied: progData.stats.booksStudied || 0,
              summariesGenerated: progData.stats.summariesGenerated || 0,
              quizzesCompleted: progData.stats.quizzesCompleted || 0,
              averageScore: progData.stats.averageScore || 0,
              streakDays: user.streakDays || 0,
              totalStudyHours: user.totalStudyHours || 0,
              scoreTrend: progData.stats.scoreTrend || null,
              scoreTrendPositive: progData.stats.scoreTrendPositive ?? true
            },
            subjectProgress: progData.subjectProgress || [],
            activities: actData.activities || [],
            quizHistory: realQuizHistory
          };
        } else if (progRes.status === 401) {
          storageService.removeToken();
        }
      } catch (err) {
        console.warn("Analytics API notice:", err.message);
      }
    }

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
        totalStudyHours: user.totalStudyHours || 0,
        scoreTrend: null,
        scoreTrendPositive: true
      },
      subjectProgress: subjects,
      quizHistory: []
    };
  }
};
