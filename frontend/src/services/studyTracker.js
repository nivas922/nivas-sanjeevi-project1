import { storageService } from "./storageService";
import { api } from "./api";

/**
 * Returns the current date in local student time formatted as YYYY-MM-DD.
 */
export const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

class StudyTrackerService {
  constructor() {
    this.currentActivity = null; // 'summary' | 'textbook' | 'quiz'
    this.accumulatedActiveSeconds = 0;
    this.lastInteractionTime = Date.now();
    this.isUserIdle = false;
    this.idleTimeoutMs = 60000; // 60 seconds without interaction marks as idle
    this.ticker = null;
    this.flushTimer = null;
    this.listenersAttached = false;
  }

  initListeners() {
    if (this.listenersAttached || typeof window === "undefined") return;
    this.listenersAttached = true;

    const resetActivity = () => {
      this.lastInteractionTime = Date.now();
      if (this.isUserIdle) {
        this.isUserIdle = false;
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((evt) => {
      window.addEventListener(evt, resetActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // Tab hidden -> pause accumulation
      } else {
        resetActivity();
      }
    });

    window.addEventListener("beforeunload", () => {
      this.flush();
    });
  }

  startSession(activityType) {
    if (!activityType) return;
    this.initListeners();

    // Prevent overlapping sessions: if already running a different activity, stop it first
    if (this.currentActivity && this.currentActivity !== activityType) {
      this.stopSession();
    }

    if (this.currentActivity === activityType && this.ticker) {
      return; // Already tracking this activity
    }

    this.currentActivity = activityType;
    this.lastInteractionTime = Date.now();
    this.isUserIdle = false;

    if (!this.ticker) {
      this.ticker = setInterval(() => {
        const isTabVisible = typeof document !== "undefined" ? !document.hidden : true;
        const isInactive = (Date.now() - this.lastInteractionTime) > this.idleTimeoutMs;

        if (isInactive) {
          this.isUserIdle = true;
        }

        // Only count when the tab is visible and the student is active
        if (isTabVisible && !this.isUserIdle) {
          this.accumulatedActiveSeconds += 1;
        }
      }, 1000);
    }

    if (!this.flushTimer) {
      // Periodically flush accumulated seconds every 15 seconds
      this.flushTimer = setInterval(() => {
        if (this.accumulatedActiveSeconds >= 10) {
          this.flush();
        }
      }, 15000);
    }
  }

  flush() {
    if (this.accumulatedActiveSeconds <= 0 || !this.currentActivity) return;

    const secs = this.accumulatedActiveSeconds;
    this.accumulatedActiveSeconds = 0;
    const act = this.currentActivity;
    const date = getLocalDateString();

    // Save locally
    storageService.recordStudyTime(secs, act, date);

    // Save to backend API asynchronously
    api.recordStudySession({
      activityType: act,
      durationSeconds: secs,
      date
    }).catch(() => {});
  }

  stopSession() {
    this.flush();

    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.currentActivity = null;
    this.accumulatedActiveSeconds = 0;
  }
}

export const studyTracker = new StudyTrackerService();

