import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { StoragePreflight } from "./config/storagePreflight.js";
import { dbGet } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import ttsRoutes from "./routes/ttsRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import doubtRoutes from "./routes/doubtRoutes.js";
import translationRoutes from "./routes/translationRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
    hsts: env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true } : false
  })
);

// Restricted CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = Array.isArray(env.CORS_ORIGINS) ? env.CORS_ORIGINS : [];

    if (env.NODE_ENV !== "production") {
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    }

    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const corsErr = new Error("CORS policy violation: Access from this origin is not allowed.");
    corsErr.statusCode = 403;
    return callback(corsErr);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// HTTP Logger
if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Request parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Static uploads directory (Audio files, books, profile pics)
app.use("/uploads", express.static(env.UPLOAD_DIR));

// Rate limiter for standard requests
app.use(apiRateLimiter);

// Liveness check endpoints (Container survival probe - independent of external AI providers)
const healthHandler = (req, res) => {
  const isMaintenance = process.env.MAINTENANCE_MODE === "true";
  res.status(200).json({
    status: "healthy",
    mode: isMaintenance ? "maintenance" : "normal",
    service: "LearnAI Backend",
    environment: env.NODE_ENV,
    database: "connected",
    timestamp: new Date().toISOString()
  });
};
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);
app.get("/live", healthHandler);
app.get("/api/live", healthHandler);

// Readiness check endpoints (Traffic routing probe - returns 503 during maintenance, preflight failure, or db disconnect)
const readinessHandler = async (req, res) => {
  const isMaintenance = process.env.MAINTENANCE_MODE === "true";
  if (isMaintenance) {
    res.set("Retry-After", "300");
    return res.status(503).json({
      ready: false,
      mode: "maintenance",
      message: "LearnAI service is in maintenance mode. Writes are temporarily disabled.",
      timestamp: new Date().toISOString()
    });
  }

  // Active validation: storage preflight check (fail-closed on failure or thrown exception)
  try {
    const preflight = StoragePreflight.validate();
    if (!preflight || !preflight.ok) {
      return res.status(503).json({
        ready: false,
        status: "unready",
        error: "Storage validation failed.",
        timestamp: new Date().toISOString()
      });
    }
  } catch (preflightErr) {
    console.error("❌ [Readiness Probe] Storage preflight exception:", preflightErr.message);
    return res.status(503).json({
      ready: false,
      status: "unready",
      error: "Storage validation failed.",
      timestamp: new Date().toISOString()
    });
  }

  // Active validation: database responsive check (uses existing singleton connection)
  try {
    await dbGet("SELECT 1;");
  } catch (dbErr) {
    console.error("❌ [Readiness Probe] Database query failed:", dbErr.message);
    return res.status(503).json({
      ready: false,
      status: "unready",
      error: "Database is not ready or unresponsive.",
      timestamp: new Date().toISOString()
    });
  }

  return res.status(200).json({
    ready: true,
    status: "ready",
    database: "connected",
    timestamp: new Date().toISOString()
  });
};
app.get("/ready", readinessHandler);
app.get("/api/ready", readinessHandler);

// Maintenance Mode Write-Freeze Middleware (Intercepts all mutating requests when MAINTENANCE_MODE=true)
app.use((req, res, next) => {
  if (process.env.MAINTENANCE_MODE === "true") {
    // Allow read-only HTTP methods to proceed
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      return next();
    }
    // Reject any mutating HTTP method with HTTP 503 Service Unavailable
    res.set("Retry-After", "300");
    return res.status(503).json({
      success: false,
      error: "LearnAI is currently in maintenance mode for scheduled database migration. Writes are temporarily disabled.",
      mode: "maintenance",
      retryAfter: 300
    });
  }
  next();
});

// Helper function to mount routes at both root and /api prefixes
const registerRoutes = (prefix = "") => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}`, bookRoutes);
  app.use(`${prefix}`, summaryRoutes);
  app.use(`${prefix}`, ttsRoutes);
  app.use(`${prefix}`, quizRoutes);
  app.use(`${prefix}`, progressRoutes);
  app.use(`${prefix}`, profileRoutes);
  app.use(`${prefix}`, recommendationRoutes);
  app.use(`${prefix}`, doubtRoutes);
  app.use(`${prefix}`, translationRoutes);
};

// Mount at both /api and /
registerRoutes("/api");
registerRoutes("");

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);
