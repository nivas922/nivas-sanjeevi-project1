import { INITIAL_SUBJECT_PROGRESS, DEPARTMENTS } from "../data/translations.js";

const STORAGE_KEYS = {
  USER: "learnai_user_v3",
  TEXTBOOKS: "learnai_textbooks_v3",
  SUMMARIES: "learnai_summaries_v3",
  QUIZZES: "learnai_quizzes_v3",
  QUIZ_ATTEMPTS: "learnai_quiz_attempts_v3",
  RECOMMENDATIONS: "learnai_recommendations_v3",
  SUBJECT_PROGRESS: "learnai_subject_progress_v3",
  ACTIVITIES: "learnai_activities_v3",
  TOKEN: "learnai_auth_token_v3"
};

export const createZeroStateUser = (name = "Student", email = "student@university.edu", department = "Computer Science & Engineering (CSE)", avatar = null) => {
  return {
    id: "usr_" + Date.now(),
    name: name,
    email: email,
    role: department,
    department: department,
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || "Student")}`,
    streakDays: 0,
    totalStudyHours: 0,
    quizzesTaken: 0,
    averageScore: 0,
    preferredLanguage: "en",
    preferredDifficulty: "Intermediate",
    speechRate: 1.0,
    speechVoice: "default",
    notifications: true
  };
};

export const storageService = {
  clearSession() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  },

  initNewUser(userData = {}) {
    const freshUser = createZeroStateUser(
      userData.name || "Student",
      userData.email || "student@university.edu",
      userData.department || DEPARTMENTS[0],
      userData.avatar
    );
    if (userData.id) freshUser.id = userData.id;
    if (userData.email) freshUser.email = userData.email;
    if (userData.role) freshUser.role = userData.role;
    if (userData.auth_provider) freshUser.auth_provider = userData.auth_provider;

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
    if (!localStorage.getItem(STORAGE_KEYS.TEXTBOOKS)) localStorage.setItem(STORAGE_KEYS.TEXTBOOKS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.SUMMARIES)) localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.QUIZZES)) localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.QUIZ_ATTEMPTS)) localStorage.setItem(STORAGE_KEYS.QUIZ_ATTEMPTS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS)) localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.SUBJECT_PROGRESS)) localStorage.setItem(STORAGE_KEYS.SUBJECT_PROGRESS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
    // NOTE: Tokens must ONLY be stored by setToken() after genuine backend authentication.
    return freshUser;
  },

  getUser() {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (!stored) return null;
    return JSON.parse(stored);
  },

  updateUser(updatedFields) {
    const current = this.getUser() || createZeroStateUser();
    const newUser = { ...current, ...updatedFields };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    return newUser;
  },

  getTextbooks() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEXTBOOKS) || "[]");
  },

  getTextbookById(id) {
    const list = this.getTextbooks();
    return list.find(tb => tb.id === id) || null;
  },

  addTextbook(textbook) {
    const list = this.getTextbooks();
    const updated = [textbook, ...list];
    localStorage.setItem(STORAGE_KEYS.TEXTBOOKS, JSON.stringify(updated));

    // Add this real uploaded subject to progress tracking
    if (textbook.subject) {
      this.incrementSubjectProgress(textbook.subject, 20);
    }

    this.addActivity({
      id: "act-" + Date.now(),
      type: "upload",
      title: `Uploaded '${textbook.title}'`,
      time: "Just now",
      badge: "Upload",
      badgeColor: "bg-blue-100 text-blue-700"
    });
    return textbook;
  },

  deleteTextbook(id) {
    const list = this.getTextbooks().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TEXTBOOKS, JSON.stringify(list));
    return true;
  },

  getSummaries() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUMMARIES) || "[]");
  },

  getSummaryById(id) {
    if (!id) return null;
    const list = this.getSummaries();
    return list.find(s => s.id === id) || null;
  },

  addSummary(summary) {
    const list = this.getSummaries();
    const updated = [summary, ...list];
    localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(updated));

    this.addActivity({
      id: "act-" + Date.now(),
      type: "summary",
      title: `Generated Summary for '${summary.topic}'`,
      time: "Just now",
      badge: "Summary",
      badgeColor: "bg-purple-100 text-purple-700"
    });
    return summary;
  },

  getQuizzes() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || "[]");
  },

  getQuizById(id) {
    if (!id) return null;
    const list = this.getQuizzes();
    return list.find(q => q.id === id) || null;
  },

  addQuiz(quiz) {
    const list = this.getQuizzes();
    const updated = [quiz, ...list];
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(updated));
    return quiz;
  },

  getQuizAttempts() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZ_ATTEMPTS) || "[]");
  },

  saveQuizAttempt(attempt) {
    const attempts = this.getQuizAttempts();
    const newAttempts = [attempt, ...attempts];
    localStorage.setItem(STORAGE_KEYS.QUIZ_ATTEMPTS, JSON.stringify(newAttempts));

    // Update user stats
    const user = this.getUser();
    if (user) {
      user.quizzesTaken = (user.quizzesTaken || 0) + 1;
      user.streakDays = Math.max(user.streakDays || 0, 1);
      user.totalStudyHours = parseFloat(((user.totalStudyHours || 0) + 0.25).toFixed(2));
      
      const totalScore = newAttempts.reduce((acc, curr) => acc + curr.percentage, 0);
      user.averageScore = Math.round(totalScore / newAttempts.length);
      this.updateUser(user);
    }

    // Update subject progress
    if (attempt.subject) {
      this.incrementSubjectProgress(attempt.subject, Math.round(attempt.percentage * 0.3));
    }

    this.updateAdaptiveRecommendations(attempt);

    this.addActivity({
      id: "act-" + Date.now(),
      type: "quiz",
      title: `Completed '${attempt.quizTitle}' (${attempt.percentage}%)`,
      time: "Just now",
      badge: "Quiz",
      badgeColor: "bg-amber-100 text-amber-700"
    });

    return attempt;
  },

  incrementSubjectProgress(subjectName, delta = 15) {
    if (!subjectName) return;
    const subjects = this.getSubjectProgress();
    const index = subjects.findIndex(s => s.subject.toLowerCase() === subjectName.toLowerCase());

    const colors = [
      { color: "bg-brand-500", text: "text-brand-700", bgLight: "bg-brand-50" },
      { color: "bg-emerald-500", text: "text-emerald-700", bgLight: "bg-emerald-50" },
      { color: "bg-purple-500", text: "text-purple-700", bgLight: "bg-purple-50" },
      { color: "bg-amber-500", text: "text-amber-700", bgLight: "bg-amber-50" },
      { color: "bg-rose-500", text: "text-rose-700", bgLight: "bg-rose-50" }
    ];
    const theme = colors[subjects.length % colors.length];

    if (index !== -1) {
      subjects[index].progress = Math.min(100, (subjects[index].progress || 0) + delta);
    } else {
      subjects.push({
        subject: subjectName,
        progress: Math.min(100, delta),
        color: theme.color,
        text: theme.text,
        bgLight: theme.bgLight
      });
    }
    localStorage.setItem(STORAGE_KEYS.SUBJECT_PROGRESS, JSON.stringify(subjects));
  },

  updateAdaptiveRecommendations() {
    // Phase 7: Recommendations are generated dynamically by backend AdaptiveLearningService
    // from full student quiz history, not stored as static or single-attempt items in localStorage.
  },

  getRecommendations() {
    return [];
  },

  getSubjectProgress() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECT_PROGRESS) || "[]");
  },

  getActivities() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || "[]");
  },

  addActivity(activity) {
    const list = this.getActivities();
    const updated = [activity, ...list].slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
  },

  getToken() {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) return null;
    // Discard any legacy fake/mock tokens or malformed non-JWT strings
    if (
      token.startsWith("mock_") ||
      token.startsWith("jwt_token_") ||
      token === "demo_google_id_token_12345" ||
      token.split(".").length !== 3
    ) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      return null;
    }
    return token;
  },

  setToken(token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },

  removeToken() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
};
