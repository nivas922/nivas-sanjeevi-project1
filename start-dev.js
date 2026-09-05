import { spawn } from "child_process";

console.log("====================================================");
console.log("?? Starting LearnAI System (Backend + Frontend)");
console.log("====================================================");

console.log("?? Starting Backend on http://localhost:5000...");
const backend = spawn("npm", ["run", "dev"], { cwd: "backend", shell: true, stdio: "inherit" });

console.log("?? Starting Frontend on http://localhost:5173...");
const frontend = spawn("npm", ["run", "dev"], { cwd: "frontend", shell: true, stdio: "inherit" });

const cleanup = () => {
  console.log("\nStopping servers...");
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);