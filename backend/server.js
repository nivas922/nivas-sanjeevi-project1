import { app } from "./src/app.js";
import { env, validateProductionConfig } from "./src/config/env.js";
import { initDb } from "./src/config/db.js";

const startServer = async () => {
  try {
    // Validate production secrets & configuration
    validateProductionConfig();

    // Initialize database tables & indexes
    await initDb();

    const server = app.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(` LearnAI Backend Server is running on port ${env.PORT}`);
      console.log(` Environment: ${env.NODE_ENV}`);
      console.log(` Database: SQLite (${env.DB_FILE})`);
      console.log(` API Base URLs: http://localhost:${env.PORT}/ and http://localhost:${env.PORT}/api/`);
      console.log(`====================================================`);
    });

    // Graceful shutdown handlers
    const handleShutdown = (signal) => {
      console.log(`\n[Process] Received ${signal}. Initiating graceful shutdown...`);
      server.close(() => {
        console.log("[Process] HTTP server closed successfully. Exiting.");
        process.exit(0);
      });

      // Force exit after 5 seconds if connections linger
      setTimeout(() => {
        console.error("[Process] Forced shutdown after timeout.");
        process.exit(1);
      }, 5000).unref();
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
