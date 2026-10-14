/**
 * In-memory background job tracking for textbook summarization.
 * Enables non-blocking asynchronous execution, deduplication of concurrent requests,
 * and resilient client polling across proxy timeouts on Render/Cloudflare/Vercel.
 */

function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== "string") return "Summarization job failed";
  return msg
    .replace(/(?:key|apiKey|token|bearer)=([a-zA-Z0-9_\-\.]{8,})/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]");
}

class SummarizationJobService {
  constructor() {
    this.jobs = new Map(); // Key: `${bookId}::${language}`
  }

  getJobKey(bookId, language = "en") {
    return `${bookId}::${language.toLowerCase()}`;
  }

  getJob(bookId, language = "en") {
    return this.jobs.get(this.getJobKey(bookId, language)) || null;
  }

  createOrGetJob(bookId, language = "en", runner) {
    const key = this.getJobKey(bookId, language);
    if (this.jobs.has(key)) {
      return this.jobs.get(key);
    }

    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bookId,
      language: language.toLowerCase(),
      status: "processing", // "processing" | "completed" | "failed"
      progress: 10,
      stage: "Analyzing document chunks",
      result: null,
      error: null,
      startTime: Date.now(),
      promise: null
    };

    job.promise = (async () => {
      try {
        job.progress = 25;
        job.stage = "Synthesizing section summaries";
        const result = await runner((progress, stage) => {
          job.progress = progress;
          if (stage) job.stage = stage;
        });

        job.status = "completed";
        job.progress = 100;
        job.stage = "Completed successfully";
        job.result = result;
        return result;
      } catch (err) {
        job.status = "failed";
        job.stage = "Failed";
        job.error = sanitizeErrorMessage(err.message);
        throw err;
      } finally {
        // Automatically evict job record after 15 minutes to keep memory bounded on Render
        setTimeout(() => {
          this.jobs.delete(key);
        }, 15 * 60 * 1000).unref?.();
      }
    })();

    this.jobs.set(key, job);
    return job;
  }

  clearJob(bookId, language = "en") {
    this.jobs.delete(this.getJobKey(bookId, language));
  }
}

export const summarizationJobService = new SummarizationJobService();
