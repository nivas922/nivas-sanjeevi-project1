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

export const resolveBackendUrl = (pathOrUrl) => {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return "";
  let trimmed = pathOrUrl.trim();

  // If Cloudinary upload asset without inline flag, append fl_inline to request inline delivery
  if (trimmed.includes("cloudinary.com") && !trimmed.includes("fl_inline")) {
    if (trimmed.includes("/raw/upload/")) {
      trimmed = trimmed.replace("/raw/upload/", "/raw/upload/fl_inline/");
    } else if (trimmed.includes("/image/upload/")) {
      trimmed = trimmed.replace("/image/upload/", "/image/upload/fl_inline/");
    }
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const apiBase = resolveApiBaseUrl();
  if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
    const origin = apiBase.replace(/\/api\/?$/, "");
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${origin}${cleanPath}`;
  }

  if (import.meta.env?.PROD) {
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `https://nivas-sanjeevi-project1-1.onrender.com${cleanPath}`;
  }

  return trimmed;
};

export const getAuthHeaders = () => {
  const headers = {
    "Content-Type": "application/json"
  };
  const token = storageService.getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
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
        const uploadHeaders = {};
        const token = storageService.getToken();
        if (token) {
          uploadHeaders["Authorization"] = `Bearer ${token}`;
        }
        const uploadRes = await fetchWithTimeout(`${API_BASE_URL}/upload-book`, {
          method: "POST",
          headers: uploadHeaders,
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
      // Immediately register the genuine uploaded book into client storage
      storageService.addTextbook(backendBook);
      if (typeof options.onArtifactCreated === "function") {
        options.onArtifactCreated("existingBook", backendBook);
      }
      options.existingBook = backendBook;
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
      const summarizeTimeoutMs = options.summarizeTimeoutMs || options.timeoutMs || 150000;
      try {
        const sumRes = await fetchWithTimeout(`${API_BASE_URL}/summarize`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            book_id: bookId,
            target_language: langCode
          })
        }, summarizeTimeoutMs);
        sumData = await handleApiResponse(sumRes);
      } catch (err) {
        const isTimeout =
          err.name === "AbortError" ||
          err.message?.toLowerCase().includes("timed out") ||
          err.message?.toLowerCase().includes("timeout");

        if (isTimeout) {
          // Resilient check: see if background job completed or is actively processing
          try {
            const statusRes = await fetchWithTimeout(
              `${API_BASE_URL}/summarize/status/${bookId}?target_language=${langCode}`,
              { headers: getAuthHeaders() },
              8000
            );
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === "completed" && statusData.summary) {
                sumData = { success: true, summary: statusData.summary };
              } else if (statusData.status === "processing") {
                let pollAttempts = 0;
                while (pollAttempts < 12) {
                  await sleep(2500);
                  pollAttempts++;
                  const pollRes = await fetch(
                    `${API_BASE_URL}/summarize/status/${bookId}?target_language=${langCode}`,
                    { headers: getAuthHeaders() }
                  );
                  if (pollRes.ok) {
                    const pollData = await pollRes.json();
                    if (pollData.status === "completed" && pollData.summary) {
                      sumData = { success: true, summary: pollData.summary };
                      break;
                    }
                    if (pollData.status === "failed") {
                      throw new Error(pollData.error || "Summarization job failed on server.");
                    }
                  }
                }
              }
            }
          } catch (pollErr) {
            console.warn("[Summarize-Polling] Polling notice:", pollErr.message);
          }
        }

        if (!sumData) {
          if (isTimeout) {
            const timeoutErr = new Error("AI summarization took longer than expected. Please click 'Retry Processing' to resume.");
            timeoutErr.status = 504;
            throw timeoutErr;
          }
          handleNetworkError(err);
        }
      }

      if (!sumData || !sumData.summary) {
        throw new Error("AI summarization failed: server did not return summary.");
      }

      backendSummary = sumData.summary;
      if (typeof options.onArtifactCreated === "function") {
        options.onArtifactCreated("existingSummary", backendSummary);
      }
      options.existingSummary = backendSummary;
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
            if (typeof options.onArtifactCreated === "function") {
              options.onArtifactCreated("existingQuiz", backendQuiz);
            }
            options.existingQuiz = backendQuiz;
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
          if (typeof options.onArtifactCreated === "function") {
            options.onArtifactCreated("existingLearningPlan", backendLearningPlan);
          }
          options.existingLearningPlan = backendLearningPlan;
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
      const data = await handleApiResponse(res);
      if (data && data.audioUrl) {
        data.audioUrl = resolveBackendUrl(data.audioUrl);
      }
      return data;
    } catch (err) {
      handleNetworkError(err);
    }
  },

  // Real AI Academic Doubt Solver
  async askDoubt({ bookId, question, language = "en", conversationHistory = [] }) {
    try {
      const res = await fetch(`${API_BASE_URL}/ask-doubt`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          bookId,
          question,
          language,
          conversationHistory
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
          answers: submission.selectedAnswers,
          topic: submission.topic,
          subject: submission.subject,
          quizTitle: submission.quizTitle,
          timeSpentSeconds: submission.timeSpentSeconds,
          summaryId: submission.summaryId,
          bookId: submission.bookId
        })
      });
      const data = await handleApiResponse(res);

      const resolvedTopic = (data.topic && data.topic.toLowerCase() !== "undefined")
        ? data.topic
        : (submission.topic && submission.topic.toLowerCase() !== "undefined")
        ? submission.topic
        : "General Review";

      const fullResult = {
        ...data,
        topic: resolvedTopic,
        subject: data.subject || submission.subject || "General Studies",
        quizTitle: data.quizTitle || submission.quizTitle || `${resolvedTopic} Quiz`,
        timeSpentSeconds: data.timeSpentSeconds || submission.timeSpentSeconds || 120,
        summaryId: data.summaryId || submission.summaryId || null,
        bookId: data.bookId || submission.bookId || null
      };

      storageService.saveQuizAttempt({
        id: "attempt-" + Date.now(),
        quizId: submission.quizId,
        score: fullResult.score,
        totalQuestions: fullResult.totalQuestions,
        percentage: fullResult.percentage,
        performanceLevel: fullResult.performanceLevel,
        answers: fullResult.reviewedAnswers || fullResult.answers,
        recommendedTopic: fullResult.recommendedTopic,
        recommendationDifficulty: fullResult.recommendationDifficulty,
        topic: fullResult.topic,
        subject: fullResult.subject,
        timeSpentSeconds: fullResult.timeSpentSeconds,
        summaryId: fullResult.summaryId,
        bookId: fullResult.bookId
      });
      return fullResult;
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

  async getLearningAnalytics(bookId = null) {
    const user = storageService.getUser();
    const userId = user?.id || "usr_default";
    try {
      const query = bookId ? `?bookId=${encodeURIComponent(bookId)}` : "";
      const res = await fetch(`${API_BASE_URL}/adaptive-learning/analytics/${userId}${query}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
      // Fallback to /adaptive-learning if needed
      const fallbackRes = await fetch(`${API_BASE_URL}/adaptive-learning${query}`, {
        headers: getAuthHeaders()
      });
      if (fallbackRes.ok) {
        return await fallbackRes.json();
      }
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch learning analytics.");
    } catch (err) {
      console.warn("Learning analytics API notice:", err.message);
      throw err;
    }
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
  },

  async getTextbooks() {
    try {
      const res = await fetch(`${API_BASE_URL}/books`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.books)) {
          storageService.setAllTextbooks(data.books);
          return data.books;
        }
      }
    } catch (err) {
      console.warn("getTextbooks API notice:", err.message);
    }
    return storageService.getTextbooks();
  },

  async getBookById(id) {
    if (!id) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/books/${id}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        return data.book || null;
      }
    } catch (err) {
      console.warn("getBookById API notice:", err.message);
    }
    return storageService.getTextbookById(id);
  },

  async deleteTextbook(id) {
    if (!id) return { success: false, error: "Textbook ID is required." };
    try {
      const res = await fetch(`${API_BASE_URL}/books/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        storageService.deleteTextbook(id);
        return data;
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to delete textbook (HTTP ${res.status})`);
    } catch (err) {
      if (id.startsWith("tb-") || id.startsWith("demo-")) {
        storageService.deleteTextbook(id);
        return { success: true, localOnly: true };
      }
      throw err;
    }
  },

  async deleteSummary(id) {
    if (!id) return { success: false, error: "Summary ID is required." };
    try {
      const res = await fetch(`${API_BASE_URL}/summaries/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        storageService.deleteSummary(id);
        return data;
      }
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        throw new Error(errData.error || `Access denied (HTTP ${res.status})`);
      }
      if (res.status === 404 && (id.startsWith("sum-") || id.startsWith("demo-"))) {
        storageService.deleteSummary(id);
        return { success: true, localOnly: true };
      }
      throw new Error(errData.error || `Failed to delete summary (HTTP ${res.status})`);
    } catch (err) {
      if (err.message && (err.message.includes("Access denied") || err.message.includes("Authentication"))) {
        throw err;
      }
      if (id.startsWith("sum-") || id.startsWith("demo-")) {
        storageService.deleteSummary(id);
        return { success: true, localOnly: true };
      }
      throw err;
    }
  },

  async getBookPdfBlob(book) {
    if (!book) throw new Error("No textbook details provided.");

    // 1. Direct fetch if fileUrl / rawUrl is present
    const rawUrl = book.fileUrl || book.file_url || book.pdfUrl || book.pdf_url;
    if (rawUrl && typeof rawUrl === "string" && rawUrl.trim()) {
      const targetUrl = resolveBackendUrl(rawUrl);
      if (targetUrl) {
        try {
          const res = await fetch(targetUrl);
          if (res.ok) {
            const rawBlob = await res.blob();
            return new Blob([rawBlob], { type: "application/pdf" });
          }
        } catch (fetchErr) {
          console.warn("Direct PDF fetch failed, falling back to proxy:", fetchErr.message);
        }
      }
    }

    // 2. Fetch via backend proxy /api/books/:id/file
    if (book.id) {
      const proxyUrl = resolveBackendUrl(`/api/books/${book.id}/file`);
      const token = storageService.getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(proxyUrl, { headers });
      if (res.ok) {
        const rawBlob = await res.blob();
        return new Blob([rawBlob], { type: "application/pdf" });
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Failed to fetch PDF (HTTP ${res.status})`);
    }

    throw new Error("Unable to locate PDF file for textbook.");
  },

  async getBookPdfArrayBuffer(id, bookHint = null) {
    if (!id) throw new Error("Textbook ID is required.");

    // 1. Fetch through authenticated backend proxy /api/books/:id/file
    const proxyUrl = resolveBackendUrl(`/api/books/${id}/file`);
    const token = storageService.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(proxyUrl, { headers });
      if (res.ok) {
        return await res.arrayBuffer();
      }
      if (res.status === 401) {
        throw new Error("Authentication required. Please sign in to read this textbook.");
      }
      if (res.status === 403) {
        throw new Error("Access denied. You do not have permission to read this textbook.");
      }
    } catch (err) {
      if (err.message && (err.message.includes("Access denied") || err.message.includes("Authentication required"))) {
        throw err;
      }
    }

    // 2. Direct fallback if fileUrl is available on book record
    const book = bookHint || storageService.getTextbookById(id);
    const rawUrl = book?.fileUrl || book?.file_url || book?.pdfUrl || book?.pdf_url;
    if (rawUrl && typeof rawUrl === "string" && rawUrl.trim()) {
      const targetUrl = resolveBackendUrl(rawUrl);
      if (targetUrl) {
        const directRes = await fetch(targetUrl);
        if (directRes.ok) {
          return await directRes.arrayBuffer();
        }
      }
    }

    throw new Error("Textbook PDF file could not be retrieved from server.");
  },

  async recordStudySession({ activityType, durationSeconds, date }) {
    if (!durationSeconds || durationSeconds <= 0) return null;
    try {
      const res = await fetch(`${API_BASE_URL}/study-sessions`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          activity_type: activityType,
          duration_seconds: durationSeconds,
          date
        })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Offline fallback: already recorded in storageService
    }
    return null;
  },

  async getStudySessions(date = null) {
    const localDate = date || new Date().toISOString().split("T")[0];
    try {
      const res = await fetch(`${API_BASE_URL}/study-sessions?date=${encodeURIComponent(localDate)}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Offline fallback to local storage
    }
    return storageService.getStudyStats(null, localDate);
  }
};
