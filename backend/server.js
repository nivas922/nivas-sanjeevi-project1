import { app } from "./src/app.js";
import { env } from "./src/config/env.js";
import { initDb } from "./src/config/db.js";

const startServer = async () => {
  try {
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

    return server;
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
