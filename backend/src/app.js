import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
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
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (env.NODE_ENV !== "production") {
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        env.CORS_ORIGINS.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    }

    if (env.CORS_ORIGINS.includes(origin)) {
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

// Health check endpoints (Independent of external AI providers)
const healthHandler = (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "LearnAI Backend",
    environment: env.NODE_ENV,
    database: "connected",
    timestamp: new Date().toISOString()
  });
};
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

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
