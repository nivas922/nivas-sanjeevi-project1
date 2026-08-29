import {
  INITIAL_USER,
  DEMO_TEXTBOOKS,
  DEMO_SUMMARIES,
  DEMO_QUIZZES,
  DEMO_RECOMMENDATIONS,
  SUBJECT_PROGRESS,
  RECENT_ACTIVITIES
} from "../data/demoData";

const STORAGE_KEYS = {
  USER: "learnai_user",
  TEXTBOOKS: "learnai_textbooks",
  SUMMARIES: "learnai_summaries",
  QUIZZES: "learnai_quizzes",
  QUIZ_ATTEMPTS: "learnai_quiz_attempts",
  RECOMMENDATIONS: "learnai_recommendations",
  SUBJECT_PROGRESS: "learnai_subject_progress",
  ACTIVITIES: "learnai_activities",
  TOKEN: "learnai_auth_token"
};

export const storageService = {
  // Initialize storage with demo data if empty
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USER)) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(INITIAL_USER));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TEXTBOOKS)) {
      localStorage.setItem(STORAGE_KEYS.TEXTBOOKS, JSON.stringify(DEMO_TEXTBOOKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUMMARIES)) {
      localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(DEMO_SUMMARIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUIZZES)) {
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(DEMO_QUIZZES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS)) {
      localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify(DEMO_RECOMMENDATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUBJECT_PROGRESS)) {
      localStorage.setItem(STORAGE_KEYS.SUBJECT_PROGRESS, JSON.stringify(SUBJECT_PROGRESS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(RECENT_ACTIVITIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TOKEN)) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, "demo_jwt_token_alex_101");
    }
  },

  getUser() {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || JSON.stringify(INITIAL_USER));
  },

  updateUser(updatedFields) {
    const current = this.getUser();
    const newUser = { ...current, ...updatedFields };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    return newUser;
  },

  getTextbooks() {
    this.init();
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
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUMMARIES) || "[]");
  },

  getSummaryById(id) {
    const list = this.getSummaries();
    return list.find(s => s.id === id) || list[0];
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
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || "[]");
  },

  getQuizById(id) {
    const list = this.getQuizzes();
    return list.find(q => q.id === id) || list[0];
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
    user.quizzesTaken += 1;
    
    // Calculate new average
    const totalScore = newAttempts.reduce((acc, curr) => acc + curr.percentage, 0);
    user.averageScore = Math.round(totalScore / newAttempts.length);
    this.updateUser(user);

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

  updateAdaptiveRecommendations(lastAttempt) {
    // If score < 60% -> Add targeted weak topic recommendation
    const recs = this.getRecommendations();
    if (lastAttempt.percentage < 60) {
      const weakRec = {
        id: "rec-" + Date.now(),
        topic: lastAttempt.topic,
        subject: lastAttempt.subject || "Computer Science",
        reason: `Your recent score was ${lastAttempt.percentage}%. System classified this as a weak topic requiring immediate reinforcement.`,
        recommendedDifficulty: "Beginner",
        estimatedMinutes: 10,
        actionType: "summary",
        targetSummaryId: lastAttempt.summaryId || "sum-1",
        targetQuizId: lastAttempt.quizId,
        urgency: "High",
        badge: "Weak Topic Detected"
      };
      const filtered = recs.filter(r => r.topic !== lastAttempt.topic);
      localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify([weakRec, ...filtered]));
    } else if (lastAttempt.percentage >= 80) {
      // Advance to next level
      const advancedRec = {
        id: "rec-" + Date.now(),
        topic: lastAttempt.topic + " (Advanced Applications)",
        subject: lastAttempt.subject || "Computer Science",
        reason: `Excellent score of ${lastAttempt.percentage}%! System unlocked advanced deep-dive learning modules.`,
        recommendedDifficulty: "Advanced",
        estimatedMinutes: 15,
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
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS) || "[]");
  },

  getSubjectProgress() {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECT_PROGRESS) || "[]");
  },

  getActivities() {
    this.init();
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
  }
};
