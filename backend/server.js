import { app } from "./src/app.js";
import { env, validateProductionConfig } from "./src/config/env.js";
import { initDb, checkpointAndCloseDb, isTurso } from "./src/config/db.js";
import { isCloudinary } from "./src/middleware/upload.js";
import { runStoragePreflight } from "./src/config/storagePreflight.js";

let isShuttingDown = false;
let activeRequests = 0;

const startServer = async () => {
  try {
    // 1. Run storage preflight before initialization
    runStoragePreflight({ exitOnFailure: true });

    // 2. Validate production secrets & configuration
    validateProductionConfig();

    // 3. Initialize database tables & indexes
    await initDb();

    const server = app.listen(env.PORT, () => {
      const activeDb = isTurso ? "Turso (@libsql/client remote SQLite)" : `SQLite (${env.DB_FILE})`;
      const activeStorage = isCloudinary ? "Cloudinary (authenticated cloud stream)" : `Local Storage (${env.UPLOAD_DIR})`;
      console.log(`====================================================`);
      console.log(` LearnAI Backend Server is running on port ${env.PORT}`);
      console.log(` Environment: ${env.NODE_ENV}`);
      console.log(` Database: ${activeDb}`);
      console.log(` File Storage: ${activeStorage}`);
      if (isCloudinary) {
        console.log(` Audio Cache: Local Ephemeral (${env.UPLOAD_DIR})`);
      }
      console.log(` API Base URLs: http://localhost:${env.PORT}/ and http://localhost:${env.PORT}/api/`);
      console.log(`====================================================`);
    });

    // Track active HTTP connections for graceful draining - exactly one decrement per request
    server.on("request", (req, res) => {
      activeRequests++;
      let decremented = false;
      const decrement = () => {
        if (!decremented) {
          decremented = true;
          activeRequests = Math.max(0, activeRequests - 1);
        }
      };
      res.on("finish", decrement);
      res.on("close", decrement);
    });

    // Enhanced graceful shutdown handler
    const handleShutdown = async (signal) => {
      if (isShuttingDown) {
        console.log(`[Process] Shutdown already in progress. Ignoring duplicate ${signal}.`);
        return;
      }
      isShuttingDown = true;
      console.log(`\n[Process] Received ${signal}. Initiating graceful shutdown...`);

      // 8-second hard timeout guard to allow up to 5s drain + 3s checkpoint/close
      const forceTimer = setTimeout(() => {
        console.error("❌ [Process] Graceful shutdown timed out after 8s. Forcing exit with code 1.");
        process.exit(1);
      }, 8000);
      forceTimer.unref();

      try {
        // Step A: Stop accepting new HTTP requests
        await new Promise((resolve) => {
          server.close((err) => {
            if (err) console.warn("⚠️ [Process] HTTP server close notice:", err.message);
            else console.log(" [Process] HTTP server stopped accepting new connections.");
            resolve();
          });
        });

        // Step B: Wait for active requests to finish (up to 5 seconds)
        let drainAttempts = 0;
        while (activeRequests > 0 && drainAttempts < 50) {
          await new Promise((r) => setTimeout(r, 100));
          drainAttempts++;
        }
        if (activeRequests > 0) {
          console.warn(`⚠️ [Process] Drained with ${activeRequests} requests still lingering after 5s.`);
        } else {
          console.log(" [Process] All active HTTP requests drained successfully.");
        }

        // Step C: Checkpoint SQLite WAL journal and close database connection
        await checkpointAndCloseDb();

        clearTimeout(forceTimer);
        console.log(" [Process] Graceful shutdown completed cleanly. Exiting with code 0.");
        process.exit(0);
      } catch (shutdownErr) {
        clearTimeout(forceTimer);
        console.error("❌ [Process] Error during shutdown:", shutdownErr.message);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));

    return server;
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
