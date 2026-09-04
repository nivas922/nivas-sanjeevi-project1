import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("🚀 Installing frontend dependencies on Vercel build machine...");
execSync("npm install", { cwd: "frontend", stdio: "inherit" });

console.log("🚀 Building frontend bundle...");
execSync("npm run build", { cwd: "frontend", stdio: "inherit" });

const srcDist = path.resolve("frontend/dist");
const targetDist = path.resolve("dist");

if (fs.existsSync(targetDist)) {
  fs.rmSync(targetDist, { recursive: true, force: true });
}

fs.cpSync(srcDist, targetDist, { recursive: true });
console.log(" Production build published to root ./dist");
