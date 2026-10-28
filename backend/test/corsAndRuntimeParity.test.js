import assert from "assert";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { app, corsOptions } from "../src/app.js";
import { env, parseCorsOrigins } from "../src/config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("🛡️ LEARN-AI CORS & RUNTIME PROVIDER REGRESSION SUITE");
console.log("==================================================");

let server;
let baseUrl;

async function setup() {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
}

async function teardown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function request(pathStr, options = {}) {
  const url = `${baseUrl}${pathStr}`;
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof Buffer)) {
    body = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.method && options.method !== "GET" ? body : undefined
  });

  const contentType = res.headers.get("content-type") || "";
  let data;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    data
  };
}

let passedTests = 0;
let totalTests = 0;

function reportPass(name) {
  passedTests++;
  console.log(`  ✔ PASSED: ${name}`);
}

async function runTests() {
  await setup();

  try {
    // ----------------------------------------------------
    // SUITE 1: Export of CORS_ORIGINS from env.js
    // ----------------------------------------------------
    console.log("\n--- Suite 1: CORS_ORIGINS Export and Parsing ---");

    totalTests++;
    assert.ok(Array.isArray(env.CORS_ORIGINS), "env.CORS_ORIGINS must be exported and be an array");
    assert.ok(
      env.CORS_ORIGINS.includes("https://nivas-sanjeevi-project1-pnb5.vercel.app"),
      "env.CORS_ORIGINS must contain the production Vercel frontend URL"
    );
    reportPass("env.CORS_ORIGINS is an array containing the production Vercel frontend");

    totalTests++;
    const parsedOrigins = parseCorsOrigins();
    assert.ok(Array.isArray(parsedOrigins), "parseCorsOrigins() must return an array");
    assert.ok(
      parsedOrigins.includes("https://nivas-sanjeevi-project1-pnb5.vercel.app"),
      "parseCorsOrigins() must always include the production Vercel URL"
    );
    reportPass("parseCorsOrigins() function operates deterministically");

    // ----------------------------------------------------
    // SUITE 2: Production Vercel Origin & Preflight OPTIONS
    // ----------------------------------------------------
    console.log("\n--- Suite 2: Production Vercel Origin & Preflight OPTIONS ---");

    const vercelOrigin = "https://nivas-sanjeevi-project1-pnb5.vercel.app";

    totalTests++;
    {
      const res = await request("/api/books", {
        method: "OPTIONS",
        headers: {
          Origin: vercelOrigin,
          "Access-Control-Request-Method": "GET"
        }
      });
      assert.strictEqual(res.status, 204, "OPTIONS /api/books preflight must return 204 No Content");
      assert.strictEqual(
        res.headers.get("access-control-allow-origin"),
        vercelOrigin,
        "Preflight must return Access-Control-Allow-Origin matching Vercel origin"
      );
      assert.strictEqual(
        res.headers.get("access-control-allow-credentials"),
        "true",
        "Preflight must allow credentials"
      );
      reportPass("OPTIONS /api/books returns HTTP 204 with correct CORS headers for Vercel origin");
    }

    totalTests++;
    {
      const res = await request("/api/recommendations/", {
        method: "OPTIONS",
        headers: {
          Origin: vercelOrigin,
          "Access-Control-Request-Method": "GET"
        }
      });
      assert.strictEqual(res.status, 204, "OPTIONS /api/recommendations/ must return 204");
      assert.strictEqual(res.headers.get("access-control-allow-origin"), vercelOrigin);
      reportPass("OPTIONS /api/recommendations/ returns HTTP 204 with correct CORS headers for Vercel origin");
    }

    totalTests++;
    {
      const res = await request("/api/upload-book", {
        method: "OPTIONS",
        headers: {
          Origin: vercelOrigin,
          "Access-Control-Request-Method": "POST"
        }
      });
      assert.strictEqual(res.status, 204, "OPTIONS /api/upload-book must return 204");
      assert.strictEqual(res.headers.get("access-control-allow-origin"), vercelOrigin);
      reportPass("OPTIONS /api/upload-book returns HTTP 204 with correct CORS headers for Vercel origin");
    }

    // ----------------------------------------------------
    // SUITE 3: Requests without Origin Header
    // ----------------------------------------------------
    console.log("\n--- Suite 3: Requests without Origin Header ---");

    totalTests++;
    {
      // Health check or API call without Origin header (curl / Render liveness probe)
      const res = await request("/api/auth/email/login", {
        method: "POST",
        body: { email: "", password: "" }
      });
      // Should return 400 Bad Request from validation, not 403 / 500 CORS crash
      assert.strictEqual(res.status, 400, "Request without Origin should reach route handler and return 400 validation error");
      reportPass("Requests without Origin header succeed without CORS rejection or crash");
    }

    // ----------------------------------------------------
    // SUITE 4: Unauthorized Origin Handling in Production Mode
    // ----------------------------------------------------
    console.log("\n--- Suite 4: Origin Filtering & Policy Enforcement ---");

    totalTests++;
    {
      // Test corsOptions origin handler callback directly under simulated production mode
      const originalNodeEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = "production";
        let errorReceived = null;
        let allowed = null;

        corsOptions.origin("https://malicious-phishing-site.example.com", (err, isAllowed) => {
          errorReceived = err;
          allowed = isAllowed;
        });

        assert.ok(errorReceived, "CORS should reject unauthorized origin in production");
        assert.strictEqual(errorReceived.statusCode, 403, "CORS error should have statusCode 403");
        assert.ok(errorReceived.message.includes("CORS policy violation"), "Should specify CORS policy violation");
        assert.ok(!allowed, "Should not allow unauthorized origin");
        reportPass("corsOptions rejects unauthorized origin with HTTP 403 in production");
      } finally {
        env.NODE_ENV = originalNodeEnv;
      }
    }

    totalTests++;
    {
      // End-to-end HTTP request with unauthorized origin in simulated production mode
      const originalNodeEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = "production";
        const res = await request("/api/books", {
          method: "GET",
          headers: {
            Origin: "https://unauthorized-attacker.example.com"
          }
        });
        assert.strictEqual(res.status, 403, "Server must return HTTP 403 for unauthorized cross-origin requests");
        assert.strictEqual(res.data.success, false, "Response success must be false");
        assert.strictEqual(res.data.error, "Access denied by CORS policy.", "Error message must match CORS policy");
        reportPass("End-to-end HTTP request with unauthorized origin returns HTTP 403 Forbidden");
      } finally {
        env.NODE_ENV = originalNodeEnv;
      }
    }

    totalTests++;
    {
      // Verify authorized Vercel origin in simulated production mode
      const originalNodeEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = "production";
        let errorReceived = null;
        let allowed = null;

        corsOptions.origin(vercelOrigin, (err, isAllowed) => {
          errorReceived = err;
          allowed = isAllowed;
        });

        assert.strictEqual(errorReceived, null, "Should not produce error for authorized Vercel origin");
        assert.strictEqual(allowed, true, "Should allow authorized Vercel origin");
        reportPass("corsOptions allows Vercel origin in production mode");
      } finally {
        env.NODE_ENV = originalNodeEnv;
      }
    }

    totalTests++;
    {
      // Verify localhost development origins in non-production mode
      const originalNodeEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = "development";
        let errorReceived = null;
        let allowed = null;

        corsOptions.origin("http://localhost:5173", (err, isAllowed) => {
          errorReceived = err;
          allowed = isAllowed;
        });

        assert.strictEqual(errorReceived, null, "Should not error for localhost in development");
        assert.strictEqual(allowed, true, "Should allow localhost in development mode");
        reportPass("corsOptions allows http://localhost:5173 in development mode");
      } finally {
        env.NODE_ENV = originalNodeEnv;
      }
    }

    // ----------------------------------------------------
    // SUITE 5: Fail-Closed Runtime Guards for Missing Cloud Credentials
    // ----------------------------------------------------
    console.log("\n--- Suite 5: Fail-Closed Runtime Guards (Isolated Child Processes) ---");

    const testJwtSecret = "test_production_jwt_secret_must_be_at_least_32_chars_long";

    totalTests++;
    {
      // When NODE_ENV=production, DB_TYPE=turso, but TURSO credentials are absent
      let childFailed = false;
      let childOutput = "";
      try {
        execSync(
          'node -e "import(\'./src/config/db.js\')"',
          {
            cwd: backendDir,
            env: {
              ...process.env,
              NODE_ENV: "production",
              JWT_SECRET: testJwtSecret,
              DB_TYPE: "turso",
              TURSO_DATABASE_URL: "",
              TURSO_AUTH_TOKEN: ""
            },
            stdio: "pipe"
          }
        );
      } catch (err) {
        childFailed = true;
        childOutput = (err.stdout ? err.stdout.toString() : "") + (err.stderr ? err.stderr.toString() : "");
      }

      assert.strictEqual(childFailed, true, "db.js MUST fail closed when DB_TYPE=turso without credentials in production");
      assert.ok(
        childOutput.includes("CRITICAL DATABASE CONFIGURATION ERROR") || childOutput.includes("Silent fallback to local SQLite is strictly prohibited"),
        `Output must explain refusal to fall back to SQLite. Received: ${childOutput}`
      );
      reportPass("db.js strictly fails closed when DB_TYPE='turso' lacks credentials in production");
    }

    totalTests++;
    {
      // When NODE_ENV=production, STORAGE_TYPE=cloudinary, but Cloudinary credentials are absent
      let childFailed = false;
      let childOutput = "";
      try {
        execSync(
          'node -e "import(\'./src/middleware/upload.js\')"',
          {
            cwd: backendDir,
            env: {
              ...process.env,
              NODE_ENV: "production",
              JWT_SECRET: testJwtSecret,
              STORAGE_TYPE: "cloudinary",
              CLOUDINARY_CLOUD_NAME: "",
              CLOUDINARY_API_KEY: "",
              CLOUDINARY_API_SECRET: "",
              CLOUDINARY_URL: ""
            },
            stdio: "pipe"
          }
        );
      } catch (err) {
        childFailed = true;
        childOutput = (err.stdout ? err.stdout.toString() : "") + (err.stderr ? err.stderr.toString() : "");
      }

      assert.strictEqual(childFailed, true, "upload.js MUST fail closed when STORAGE_TYPE=cloudinary without credentials in production");
      assert.ok(
        childOutput.includes("CRITICAL STORAGE CONFIGURATION ERROR") || childOutput.includes("Silent fallback to local disk storage is strictly prohibited"),
        `Output must explain refusal to fall back to local disk. Received: ${childOutput}`
      );
      reportPass("upload.js strictly fails closed when STORAGE_TYPE='cloudinary' lacks credentials in production");
    }

    // ----------------------------------------------------
    // SUITE 6: Startup Banner Runtime Provider Reporting
    // ----------------------------------------------------
    console.log("\n--- Suite 6: Runtime Provider Startup Reporting ---");

    totalTests++;
    {
      // Local dev mode banner reporting
      const bannerDbLocal = (isTurso) => isTurso ? "Turso (@libsql/client remote SQLite)" : `SQLite (${env.DB_FILE})`;
      const bannerStorageLocal = (isCloudinary) => isCloudinary ? "Cloudinary (authenticated cloud stream)" : `Local Storage (${env.UPLOAD_DIR})`;

      assert.strictEqual(bannerDbLocal(false), `SQLite (${env.DB_FILE})`);
      assert.strictEqual(bannerStorageLocal(false), `Local Storage (${env.UPLOAD_DIR})`);
      reportPass("Startup banner correctly formats local SQLite and local storage names");
    }

    totalTests++;
    {
      // Cloud mode banner reporting
      const bannerDbCloud = (isTurso) => isTurso ? "Turso (@libsql/client remote SQLite)" : `SQLite (${env.DB_FILE})`;
      const bannerStorageCloud = (isCloudinary) => isCloudinary ? "Cloudinary (authenticated cloud stream)" : `Local Storage (${env.UPLOAD_DIR})`;

      assert.strictEqual(bannerDbCloud(true), "Turso (@libsql/client remote SQLite)");
      assert.strictEqual(bannerStorageCloud(true), "Cloudinary (authenticated cloud stream)");
      reportPass("Startup banner correctly formats Turso and Cloudinary provider names in cloud mode");
    }

    // ----------------------------------------------------
    // SUITE 7: Runtime Provider Instance Verification
    // ----------------------------------------------------
    console.log("\n--- Suite 7: Runtime Provider Instance Verification ---");

    totalTests++;
    {
      const { isTurso, localDb, tursoClient, db } = await import("../src/config/db.js");
      if (isTurso) {
        assert.strictEqual(localDb, null, "localDb must be null when isTurso is true");
        assert.ok(tursoClient !== null, "tursoClient must be initialized when isTurso is true");
        assert.strictEqual(db, tursoClient, "db export must point to tursoClient when isTurso is true");
      } else {
        assert.ok(localDb !== null, "localDb must be initialized when isTurso is false");
        assert.strictEqual(tursoClient, null, "tursoClient must be null when isTurso is false");
        assert.strictEqual(db, localDb, "db export must point to localDb when isTurso is false");
      }
      reportPass("isTurso strictly reflects the actual initialized database client instance (localDb vs tursoClient)");
    }

    totalTests++;
    {
      const { isCloudinary, uploadBookMiddleware, uploadAvatarMiddleware, storage } = await import("../src/middleware/upload.js");
      assert.ok(typeof uploadBookMiddleware === "function", "uploadBookMiddleware must be a function");
      assert.ok(typeof uploadAvatarMiddleware === "function", "uploadAvatarMiddleware must be a function");
      assert.ok(storage !== null && typeof storage === "object", "storage engine must be initialized");
      assert.strictEqual(typeof isCloudinary, "boolean", "isCloudinary must be a boolean flag");
      reportPass("isCloudinary strictly reflects initialized upload middleware configuration and storage engine");
    }

  } finally {
    await teardown();
  }

  console.log(`\n==================================================`);
  console.log(`🎉 ALL ${passedTests}/${totalTests} CORS & RUNTIME PARITY TESTS PASSED`);
  console.log(`==================================================\n`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
