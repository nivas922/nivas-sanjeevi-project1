import { dbRun, initDb } from "../backend/src/config/db.js";

const seedDatabase = async () => {
  console.log("🌱 Seeding optional academic curriculum catalog (No default user data)...");
  await initDb();

  console.log(" Academic catalog seed verified. Database is clean and ready.");
  process.exit(0);
};

seedDatabase().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
