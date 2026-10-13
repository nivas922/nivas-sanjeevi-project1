import { storageService } from "./storageService.js";
import { SUPPORTED_LANGUAGES, DEPARTMENTS } from "../data/translations.js";

const resolveApiBaseUrl = () => {
  const customUrl = import.meta.env?.VITE_API_URL;
  if (customUrl && typeof customUrl === "string" && customUrl.trim()) {
    const trimmed = customUrl.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
  if (import.meta.env?.PROD) {
    return "https://nivas-sanjeevi-project1-1.onrender.com/api";
  }
  return "/api";
};

const API_BASE_URL = resolveApiBaseUrl();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const getAuthHeaders = () => {
  return {
    "Content-Type": "application/json"
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

  // 401 Unauthorized
  if (res.status === 401) {
    const err = new Error(backendMessage || "Unauthorized request.");
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
 * Safe fetch with configurable AbortController timeout
 */
export const fetchWithTimeout = async (url, options = {}, timeoutMs = 45000) => {
  const controller = new AbortController();
  const signal = options.signal || controller.signal;
  let timerId = null;
  if (!options.signal) {
    timerId = setTimeout(() => {
      controller.abort(new Error(`Request timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
  }
  try {
    return await fetch(url, { ...options, signal });
  } finally {
    if (timerId) clearTimeout(timerId);
  }
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
    err.name === "AbortError" ||
    err.name === "TimeoutError" ||
    err.message?.toLowerCase().includes("timed out") ||
    err.message?.toLowerCase().includes("timeout") ||
    err.name === "TypeError" ||
    err.message?.includes("Failed to fetch") ||
    err.message?.includes("NetworkError") ||
    err.message?.includes("connection refused");

  if (isNetworkFailure) {
    const netErr = new Error("Unable to connect to the backend server. Please check your connection and try again.");
    netErr.isNetworkError = true;
    throw netErr;
  }

  throw err;
};

export const api = {
  async getProfile() {
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
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
  async uploadTextbook(file, metadata, onProgress = () => {}, options = {}) {
    const isScanned = file.name.endsWith(".png") || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg");
    const langCode = metadata.targetLanguage || "en";
    const questionCount = parseInt(metadata.questionCount || 5, 10);
    const timeoutMs = options.timeoutMs || 45000;

    let backendBook = options.existingBook || null;
    let backendSummary = options.existingSummary || null;
    let backendQuiz = options.existingQuiz || null;
    let backendLearningPlan = options.existingLearningPlan || null;

    let uploadData;
    // Stage 1 & 2: Uploading & Text Extraction
    if (!backendBook) {
      onProgress({ step: 1, label: "Uploading document...", percent: 12 });

      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", formattedTitle);
      formData.append("subject", metadata.subject || formattedTitle);

      onProgress({
        step: 2,
        label: isScanned ? "Scanned document detected. Extracting text using OCR..." : "Extracting selectable text with PyMuPDF...",
        percent: 25
      });

      try {
        const uploadRes = await fetchWithTimeout(`${API_BASE_URL}/upload-book`, {
          method: "POST",
          body: formData
        }, timeoutMs);
        uploadData = await handleApiResponse(uploadRes);
      } catch (err) {
        handleNetworkError(err);
      }

      if (!uploadData || !uploadData.book) {
        throw new Error("Textbook upload failed: server did not return book information.");
      }

      backendBook = uploadData.book;
    }

    const bookId = uploadData?.book_id || backendBook.id || backendBook.book_id;

    // Stage 3 & 4: Chapters and Topics structural hierarchy
    onProgress({ step: 3, label: "Detecting chapters and structural hierarchy...", percent: 40 });
    await sleep(150);
    onProgress({ step: 4, label: "Analyzing key formulas, definitions and topics...", percent: 52 });
    await sleep(150);

    // Stage 5 & 6: AI Summarization & Multilingual Audio
    if (!backendSummary) {
      onProgress({
        step: 5,
        label: `Generating AI summarization in ${metadata.targetLanguageName || "selected language"}...`,
        percent: 66
      });

      let sumData;
      try {
        const sumRes = await fetchWithTimeout(`${API_BASE_URL}/summarize`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            book_id: bookId,
            target_language: langCode
          })
        }, timeoutMs);
        sumData = await handleApiResponse(sumRes);
      } catch (err) {
        handleNetworkError(err);
      }

      if (!sumData || !sumData.summary) {
        throw new Error("AI summarization failed: server did not return summary.");
      }

      backendSummary = sumData.summary;
    }

    onProgress({ step: 6, label: "Synthesizing multilingual audio representations...", percent: 78 });
    await sleep(150);

    // Stage 7: Creating Adaptive Quiz Bank
    if (!backendQuiz) {
      onProgress({
        step: 7,
        label: `Creating ${metadata.questionCount || 5}-question adaptive quiz bank...`,
        percent: 88
      });

      try {
        const quizRes = await fetchWithTimeout(`${API_BASE_URL}/generate-quiz`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            book_id: bookId,
            num_questions: questionCount,
            language: langCode
          })
        }, timeoutMs);
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
    }

    // Stage 8: Preparing Personalized Learning Plan
    onProgress({ step: 8, label: "Preparing personalized learning plan...", percent: 96 });

    if (!backendLearningPlan) {
      try {
        const planRes = await fetchWithTimeout(`${API_BASE_URL}/adaptive-learning/${bookId}`, {
          headers: getAuthHeaders()
        }, options.planTimeoutMs || 8000);
        if (planRes.ok) {
          backendLearningPlan = await planRes.json();
        }
      } catch (planErr) {
        console.warn("Adaptive learning plan preparation notice:", planErr.message);
      }
    }

    // Mark all stages 100% complete
    onProgress({ step: 9, label: "Personalized learning curriculum ready!", percent: 100 });

    // Save genuine backend artifacts to storageService ONLY on success:
    storageService.addTextbook(backendBook);
    storageService.addSummary(backendSummary);

    return {
      status: "success",
      textbook: backendBook,
      summary: backendSummary,
      quiz: backendQuiz,
      learningPlan: backendLearningPlan
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
      }
    } catch (err) {
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
      } else if (res.status === 404) {
        return null;
      }
    } catch (err) {
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
      }
    } catch (err) {
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

  async translateSummary(summaryId, targetLang, summary = null) {
    try {
      const res = await fetch(`${API_BASE_URL}/summaries/${summaryId}/translate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          target_language: targetLang,
          summary: summary || undefined
        })
      });
      return await handleApiResponse(res);
    } catch (err) {
      handleNetworkError(err);
    }
  },

  async translateText({ text, targetLanguage = "ta", sourceLanguage = "en" }) {
    try {
      const res = await fetch(`${API_BASE_URL}/translate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text,
          target_language: targetLanguage,
          source_language: sourceLanguage
        })
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
    const userId = user?.id || "usr_default";
    try {
      const query = bookId ? `?bookId=${encodeURIComponent(bookId)}` : "";
      const res = await fetch(`${API_BASE_URL}/recommendations/${userId}${query}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.recommendations)) {
          return data.recommendations;
        }
      }
    } catch (err) {
      console.warn("Recommendations API notice:", err.message);
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
      }
      const data = await res.json();
      throw new Error(data.error || "Failed to fetch adaptive learning data.");
    } catch (err) {
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
