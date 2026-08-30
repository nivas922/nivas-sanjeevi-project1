import { INITIAL_SUBJECT_PROGRESS, DEPARTMENTS } from "../data/translations";

const STORAGE_KEYS = {
  USER: "learnai_user_v2",
  TEXTBOOKS: "learnai_textbooks_v2",
  SUMMARIES: "learnai_summaries_v2",
  QUIZZES: "learnai_quizzes_v2",
  QUIZ_ATTEMPTS: "learnai_quiz_attempts_v2",
  RECOMMENDATIONS: "learnai_recommendations_v2",
  SUBJECT_PROGRESS: "learnai_subject_progress_v2",
  ACTIVITIES: "learnai_activities_v2",
  TOKEN: "learnai_auth_token_v2"
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
  // Clear all previous mock data completely
  clearSession() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  },

  // Initialize fresh user in true zero-state
  initNewUser(userData = {}) {
    const freshUser = createZeroStateUser(
      userData.name || "Student",
      userData.email || "student@university.edu",
      userData.department || DEPARTMENTS[0],
      userData.avatar
    );
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
    localStorage.setItem(STORAGE_KEYS.TEXTBOOKS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.QUIZ_ATTEMPTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SUBJECT_PROGRESS, JSON.stringify(INITIAL_SUBJECT_PROGRESS));
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TOKEN, "jwt_token_" + Date.now());
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

    // Update subject progress for uploaded textbook
    this.incrementSubjectProgress(textbook.subject, 15);

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
    const list = this.getSummaries();
    return list.find(s => s.id === id) || list[0] || null;
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
    const list = this.getQuizzes();
    return list.find(q => q.id === id) || list[0] || null;
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

    // Increase subject progress based on performance
    if (attempt.subject) {
      this.incrementSubjectProgress(attempt.subject, Math.round(attempt.percentage * 0.25));
    }

    // Dynamic Adaptive engine updates
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

  incrementSubjectProgress(subjectName, delta = 10) {
    const subjects = this.getSubjectProgress();
    const index = subjects.findIndex(s => s.subject.toLowerCase().includes(subjectName.toLowerCase()) || subjectName.toLowerCase().includes(s.subject.toLowerCase()));
    
    if (index !== -1) {
      subjects[index].progress = Math.min(100, subjects[index].progress + delta);
    } else {
      subjects.push({
        subject: subjectName,
        progress: Math.min(100, delta),
        color: "bg-brand-500",
        text: "text-brand-700",
        bgLight: "bg-brand-50"
      });
    }
    localStorage.setItem(STORAGE_KEYS.SUBJECT_PROGRESS, JSON.stringify(subjects));
  },

  updateAdaptiveRecommendations(lastAttempt) {
    const recs = this.getRecommendations();
    if (lastAttempt.percentage < 60) {
      const weakRec = {
        id: "rec-" + Date.now(),
        topic: lastAttempt.topic,
        subject: lastAttempt.subject || "Computer Science",
        reason: `Your recent score was ${lastAttempt.percentage}%. System identified this as a weak topic requiring revision.`,
        recommendedDifficulty: "Beginner",
        estimatedMinutes: 8,
        actionType: "summary",
        targetSummaryId: lastAttempt.summaryId || null,
        targetQuizId: lastAttempt.quizId,
        urgency: "High",
        badge: "Weak Topic Detected"
      };
      const filtered = recs.filter(r => r.topic !== lastAttempt.topic);
      localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify([weakRec, ...filtered]));
    } else if (lastAttempt.percentage >= 80) {
      const advancedRec = {
        id: "rec-" + Date.now(),
        topic: lastAttempt.topic + " (Advanced Applications)",
        subject: lastAttempt.subject || "Computer Science",
        reason: `Great score of ${lastAttempt.percentage}%! System unlocked advanced learning challenges.`,
        recommendedDifficulty: "Advanced",
        estimatedMinutes: 12,
        actionType: "quiz",
        targetQuizId: lastAttempt.quizId,
        urgency: "Low",
        badge: "Level Up"
      };
      const filtered = recs.filter(r => r.topic !== lastAttempt.topic);
      localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify([advancedRec, ...filtered]));
    }
  },

  getRecommendations() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS) || "[]");
  },

  getSubjectProgress() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECT_PROGRESS) || JSON.stringify(INITIAL_SUBJECT_PROGRESS));
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
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },

  setToken(token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  },

  removeToken() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
};
