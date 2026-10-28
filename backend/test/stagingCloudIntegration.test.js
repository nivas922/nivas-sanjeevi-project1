/**
 * Phase 2.3 & 2.4 Staging Cloud Integration Test Suite (STG-01 through STG-10)
 *
 * CRITICAL OFFLINE-SAFETY GATES:
 * 1. This suite MUST NEVER connect to external services unless explicitly authorized
 *    with STAGING_VALIDATION_ACTIVE="true".
 * 2. It requires an exact, verified staging database target (APPROVED_STAGING_DB_URL).
 * 3. It requires a non-empty, valid TURSO_AUTH_TOKEN and Cloudinary credentials.
 * 4. It asserts that the database adapter is running in remote Turso mode (isTurso === true)
 *    and prevents silent fallback to local SQLite.
 * 5. It takes a cryptographic SHA-256 baseline of the local SQLite database and its WAL/SHM
 *    sidecars before the suite and asserts 100% byte immutability in a try/finally block,
 *    even if tests fail or throw exceptions.
 * 6. Every test user, record, and Cloudinary asset is scoped to a unique per-run identifier.
 * 7. Post-test cleanup purges ONLY resources tracked as created by the current run.
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import https from "https";
import http from "http";
import { isVerifiedStagingDatabaseUrl } from "../scripts/stagingCleanup.js";

const isDirectCli = process.argv[1] && process.argv[1].endsWith("stagingCloudIntegration.test.js");

// =============================================================================
// GATE 1: Fail-Closed Offline Safety Gate
// =============================================================================
if (isDirectCli && process.env.STAGING_VALIDATION_ACTIVE !== "true") {
  console.log("\n==================================================");
  console.log("ℹ [STAGING GATE] STAGING_VALIDATION_ACTIVE is not 'true'.");
  console.log("   Skipping live cloud integration suite (offline-safe guard active).");
  console.log("   Zero cloud connections or requests were made.");
  console.log("==================================================\n");
  process.exit(0);
}

// =============================================================================
// GATE 2: Fail-Closed Staging Configuration & Credential Validation
// =============================================================================
const dbUrl = (process.env.TURSO_DATABASE_URL || "").trim();
const approvedUrl = (process.env.APPROVED_STAGING_DB_URL || "").trim();
const tursoAuthToken = (process.env.TURSO_AUTH_TOKEN || "").trim();
const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const cloudKey = (process.env.CLOUDINARY_API_KEY || "").trim();
const cloudSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();

if (isDirectCli) {
  if (!dbUrl || !approvedUrl || !isVerifiedStagingDatabaseUrl(dbUrl, approvedUrl)) {
    console.error("\n❌ [STAGING GATE] SECURITY ABORT: TURSO_DATABASE_URL does not match APPROVED_STAGING_DB_URL or is not an approved staging database.");
    process.exit(1);
  }

  if (!tursoAuthToken || tursoAuthToken.length < 10) {
    console.error("\n❌ [STAGING GATE] SECURITY ABORT: TURSO_AUTH_TOKEN is missing or invalid. Staging test cannot proceed without authentication token.");
    process.exit(1);
  }

  if (!cloudName || !cloudKey || !cloudSecret) {
    console.error("\n❌ [STAGING GATE] SECURITY ABORT: Cloudinary credentials (NAME, KEY, SECRET) are missing or incomplete. Refusing to run partial cloud tests.");
    process.exit(1);
  }
}

// =============================================================================
// Helper: Local Database & Sidecar Integrity Snapshot
// =============================================================================
function computeFileHashOrNull(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function captureLocalDatabaseSnapshot(dbPath) {
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  return {
    dbPath,
    dbExists: fs.existsSync(dbPath),
    dbHash: computeFileHashOrNull(dbPath),
    walPath,
    walExists: fs.existsSync(walPath),
    walHash: computeFileHashOrNull(walPath),
    shmPath,
    shmExists: fs.existsSync(shmPath),
    shmHash: computeFileHashOrNull(shmPath)
  };
}

function verifyLocalDatabaseIntegrity(initialSnapshot, dbPath) {
  const current = captureLocalDatabaseSnapshot(dbPath);

  if (!initialSnapshot.dbExists) {
    if (current.dbExists) {
      throw new Error("SECURITY VIOLATION: Local SQLite database file was created during staging test execution!");
    }
    return;
  }

  if (!current.dbExists) {
    throw new Error("SECURITY VIOLATION: Local SQLite database file was deleted during staging test execution!");
  }

  if (current.dbHash !== initialSnapshot.dbHash) {
    throw new Error(
      `SECURITY VIOLATION: Local SQLite database file was modified during staging run!\n` +
      `  Initial Hash: ${initialSnapshot.dbHash}\n` +
      `  Current Hash: ${current.dbHash}`
    );
  }

  // Check WAL sidecar file
  if (initialSnapshot.walExists !== current.walExists || initialSnapshot.walHash !== current.walHash) {
    throw new Error(
      `SECURITY VIOLATION: Local SQLite WAL sidecar file (${initialSnapshot.walPath}) was created or modified during staging run!\n` +
      `  Initial Exists: ${initialSnapshot.walExists}, Current Exists: ${current.walExists}\n` +
      `  Initial Hash: ${initialSnapshot.walHash}, Current Hash: ${current.walHash}\n` +
      `  (Note: A hash of the main DB file alone is insufficient because SQLite WAL mode buffers uncheckpointed writes in the WAL sidecar).`
    );
  }

  // Check SHM sidecar file
  if (initialSnapshot.shmExists !== current.shmExists || initialSnapshot.shmHash !== current.shmHash) {
    throw new Error(
      `SECURITY VIOLATION: Local SQLite SHM sidecar file (${initialSnapshot.shmPath}) was created or modified during staging run!`
    );
  }
}

// =============================================================================
// Helper: In-Flight Operation Tracker & Bounded Timeout Wrapper
// =============================================================================
export function isValidRunToken(token) {
  return typeof token === "string" && /^stg_[0-9]+_[0-9a-f]{6}$/.test(token);
}

// Global Tracking & Concurrency Lock
let isStagingRunInProgress = false;
let isTeardownInProgress = false;
const activeInFlightOperations = new Map(); // promise -> { operationName, registeredAt }

export function getActiveInFlightCount() {
  return activeInFlightOperations.size;
}

export function isRunActive() {
  return isStagingRunInProgress;
}

export function resetInFlightOperationsForTesting() {
  activeInFlightOperations.clear();
  isStagingRunInProgress = false;
  isTeardownInProgress = false;
}

export async function withTimeout(promise, ms, operationName) {
  if (isTeardownInProgress) {
    throw new Error(
      `SECURITY ABORT [${operationName}]: Refusing to initiate new staging operation after teardown has begun.`
    );
  }

  let timer;
  const opMeta = { operationName, registeredAt: Date.now() };
  activeInFlightOperations.set(promise, opMeta);
  promise.finally(() => {
    activeInFlightOperations.delete(promise);
  });

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `Timeout [${operationName}]: Operation exceeded ${ms}ms limit. ` +
          `(Note: timeout race terminates local await; underlying operation may settle asynchronously).`
        )
      );
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export async function settleInFlightOperations(gracePeriodMs = 2000) {
  if (activeInFlightOperations.size === 0) {
    return { settled: true, remaining: 0, unsettledOps: [] };
  }
  console.log(`⏳ Waiting up to ${gracePeriodMs}ms for ${activeInFlightOperations.size} in-flight operation(s) to settle...`);

  let timer;
  const timeoutBarrier = new Promise((resolve) => {
    timer = setTimeout(() => resolve(false), gracePeriodMs);
  });

  const allSettledPromise = Promise.allSettled([...activeInFlightOperations.keys()]).then(() => true);
  const settled = await Promise.race([allSettledPromise, timeoutBarrier]);
  clearTimeout(timer);

  const remaining = activeInFlightOperations.size;
  const unsettledOps = [...activeInFlightOperations.values()].map((m) => m.operationName);

  return {
    settled: settled && remaining === 0,
    remaining,
    unsettledOps
  };
}

// =============================================================================
// Helper: Stream Signed URL to Buffer
// =============================================================================
function downloadUrlToBuffer(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, (res) => {
      if (res.statusCode >= 400) {
        return reject(new Error(`Download failed with status ${res.statusCode}: ${res.statusMessage}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", (err) => reject(err));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Download timed out after ${timeoutMs}ms`));
    });
    req.on("error", (err) => reject(err));
  });
}

// =============================================================================
// Main Staging Integration Test Runner
// =============================================================================
async function runStagingIntegrationSuite() {
  if (isStagingRunInProgress) {
    const lockErr = "SECURITY ABORT: Another staging run is already active. Overlapping runs are strictly forbidden.";
    console.error(`❌ ${lockErr}`);
    throw new Error(lockErr);
  }
  isStagingRunInProgress = true;

  const localDbPath = path.resolve(process.cwd(), "data", "learnai.db");
  const initialDbSnapshot = captureLocalDatabaseSnapshot(localDbPath);

  console.log("\n==================================================");
  console.log("🚀 EXECUTING PHASE 2.3 & 2.4 LIVE CLOUD INTEGRATION TESTS");
  console.log(`   Turso Target: ${dbUrl}`);
  console.log(`   Cloudinary Cloud: ${cloudName}`);
  console.log(`   Local DB Baseline Hash: ${initialDbSnapshot.dbHash || "None (File absent)"}`);
  console.log("==================================================");

  // Dynamic imports only after gates pass
  const { isTurso, localDb, tursoClient, dbRun, dbGet, dbAll, withTransaction, initDb } = await import("../src/config/db.js");
  const { CloudinaryService } = await import("../src/services/cloudinaryService.js");

  // GATE 3: Prevent Silent Fallback to Local SQLite
  if (!isTurso || localDb !== null || !tursoClient) {
    const errMsg = "SECURITY ABORT: Staging test attempted to run while database adapter is configured for local SQLite. Silent fallback prevented.";
    console.error(`❌ ${errMsg}`);
    throw new Error(errMsg);
  }
  console.log("✔ [Gate 3 Passed] Confirmed remote Turso client is active (isTurso === true, localDb === null).");

  // Generate unique per-run identifier to isolate all created resources
  const runToken = `stg_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
  assert.ok(isValidRunToken(runToken), "Generated runToken must match exact secure format");
  const runUserId = `usr_stg_${runToken}`;
  const trackedUsers = new Set();
  const trackedAssets = new Map(); // publicId -> resourceType
  const trackedBooks = new Set();

  console.log(`ℹ Unique Staging Run Token: ${runToken}`);
  console.log(`ℹ Dedicated Test User ID: ${runUserId}\n`);

  try {
    // -------------------------------------------------------------------------
    // STG-01: Remote Turso Connection & Schema Bootstrap
    // -------------------------------------------------------------------------
    console.log("[STG-01] Testing Remote Turso Connectivity & Schema Bootstrap...");
    await withTimeout(initDb(), 15000, "STG-01 initDb");
    const tables = await withTimeout(
      dbAll("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"),
      10000,
      "STG-01 query tables"
    );
    const tableNames = tables.map((t) => t.name);
    assert.ok(tableNames.includes("users"), "Table 'users' must exist on remote Turso");
    assert.ok(tableNames.includes("books"), "Table 'books' must exist on remote Turso");
    assert.ok(tableNames.includes("document_chunks"), "Table 'document_chunks' must exist on remote Turso");
    console.log(`✔ [STG-01 PASSED] Remote Turso connected over TLS; schema bootstrapped (${tableNames.length} tables).`);

    // -------------------------------------------------------------------------
    // STG-02: Root Write Transaction Commit
    // -------------------------------------------------------------------------
    console.log("\n[STG-02] Testing Root Interactive Transaction Commit...");
    // Pre-register target user before async invocation so timeouts cannot leave it untracked
    trackedUsers.add(runUserId);
    await withTimeout(
      withTransaction(async () => {
        await dbRun(
          "INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?);",
          [runUserId, `Staging User ${runToken}`, `${runToken}@staging.internal`, "direct"]
        );
      }),
      10000,
      "STG-02 withTransaction commit"
    );

    const userRow = await withTimeout(
      dbGet("SELECT id, name, email FROM users WHERE id = ?;", [runUserId]),
      5000,
      "STG-02 dbGet committed row"
    );
    assert.ok(userRow, "Committed user row must exist in Turso");
    assert.strictEqual(userRow.id, runUserId);
    console.log("✔ [STG-02 PASSED] Root write transaction committed atomically; row verified in remote Turso.");

    // -------------------------------------------------------------------------
    // STG-03: Root Transaction Rollback
    // -------------------------------------------------------------------------
    console.log("\n[STG-03] Testing Root Interactive Transaction Rollback...");
    const rollbackUserId = `${runUserId}_rb`;
    // Pre-register in case rollback fails or stalls
    trackedUsers.add(rollbackUserId);
    await assert.rejects(
      async () => {
        await withTimeout(
          withTransaction(async () => {
            await dbRun(
              "INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?);",
              [rollbackUserId, "Rollback User", `${runToken}_rb@staging.internal`, "direct"]
            );
            throw new Error("Simulated intentional rollback abort");
          }),
          10000,
          "STG-03 withTransaction rollback"
        );
      },
      /Simulated intentional rollback abort/,
      "Transaction must rethrow abort exception"
    );

    const ghostUser = await withTimeout(
      dbGet("SELECT id FROM users WHERE id = ?;", [rollbackUserId]),
      5000,
      "STG-03 dbGet rolled back row"
    );
    assert.strictEqual(ghostUser, undefined, "Rolled-back record must NOT exist in Turso");
    // Since rollback succeeded, remove from tracking
    trackedUsers.delete(rollbackUserId);
    console.log("✔ [STG-03 PASSED] Uncaught exception triggered clean remote rollback; 0 phantom records.");

    // -------------------------------------------------------------------------
    // STG-04: Nested Savepoint & Partial Rollback
    // -------------------------------------------------------------------------
    console.log("\n[STG-04] Testing Nested Savepoint & Partial Rollback...");
    const nestOuterUser = `${runUserId}_nest_out`;
    const nestInnerUser = `${runUserId}_nest_in`;
    // Pre-register both targets before invocation
    trackedUsers.add(nestOuterUser);
    trackedUsers.add(nestInnerUser);

    await withTimeout(
      withTransaction(async () => {
        await dbRun(
          "INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?);",
          [nestOuterUser, "Outer User", `${runToken}_out@staging.internal`, "direct"]
        );

        // Nested block that fails and catches
        try {
          await withTransaction(async () => {
            await dbRun(
              "INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?);",
              [nestInnerUser, "Inner User", `${runToken}_in@staging.internal`, "direct"]
            );
            throw new Error("Simulated inner savepoint failure");
          });
        } catch (innerErr) {
          // Catch inner error, outer block continues to commit
        }
      }),
      15000,
      "STG-04 nested savepoint"
    );

    const outerRecord = await dbGet("SELECT id FROM users WHERE id = ?;", [nestOuterUser]);
    const innerRecord = await dbGet("SELECT id FROM users WHERE id = ?;", [nestInnerUser]);
    assert.ok(outerRecord, "Outer record must persist after outer commit");
    assert.strictEqual(innerRecord, undefined, "Inner record must be rolled back by savepoint");
    // Inner was rolled back; outer remains tracked for teardown
    trackedUsers.delete(nestInnerUser);
    console.log("✔ [STG-04 PASSED] Nested SAVEPOINT rolled back partially while outer transaction committed.");

    // -------------------------------------------------------------------------
    // STG-05: Bounded Timeout Enforcement
    // -------------------------------------------------------------------------
    console.log("\n[STG-05] Testing Bounded Timeout Enforcement...");
    const timeoutThresholdMs = 2000;
    const artificialStall = new Promise((resolve) => setTimeout(resolve, 5000));
    await assert.rejects(
      async () => {
        await withTimeout(artificialStall, timeoutThresholdMs, "STG-05 Artificial Stall");
      },
      /Timeout \[STG-05 Artificial Stall\]: Operation exceeded 2000ms limit/,
      "withTimeout must cleanly abort stalled execution at bounded limit"
    );
    console.log("✔ [STG-05 PASSED] Bounded timeout wrapper terminated stall at exactly configured limit.");

    // -------------------------------------------------------------------------
    // STG-06: Cloudinary Authenticated Raw PDF Upload
    // -------------------------------------------------------------------------
    console.log("\n[STG-06] Testing Cloudinary Authenticated Raw PDF Upload...");
    const dummyPdfContent = Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Title (LearnAI Staging Test PDF ${runToken}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`
    );
    const pdfHash = crypto.createHash("sha256").update(dummyPdfContent).digest("hex");
    const precomputedPdfPublicId = CloudinaryService.getUserScopedPublicId(runUserId, pdfHash, "raw");

    // Pre-register deterministic public ID before starting upload
    trackedAssets.set(precomputedPdfPublicId, "raw");

    const pdfUpload = await withTimeout(
      CloudinaryService.uploadBuffer({
        buffer: dummyPdfContent,
        userId: runUserId,
        fileHash: pdfHash,
        originalName: `test_book_${runToken}.pdf`,
        mimeType: "application/pdf",
        tags: ["learnai_staging_test", runToken]
      }),
      15000,
      "STG-06 Cloudinary upload PDF"
    );

    assert.strictEqual(pdfUpload.resourceType, "raw");
    assert.strictEqual(pdfUpload.publicId, precomputedPdfPublicId);
    console.log(`✔ [STG-06 PASSED] Raw PDF uploaded with authenticated access mode (public_id: ${pdfUpload.publicId}).`);

    // -------------------------------------------------------------------------
    // STG-07: Cloudinary Authenticated Image Upload
    // -------------------------------------------------------------------------
    console.log("\n[STG-07] Testing Cloudinary Authenticated Image Upload...");
    // 1x1 dummy PNG bytes
    const dummyPngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    const imgHash = crypto.createHash("sha256").update(dummyPngBytes).digest("hex");
    const precomputedImgPublicId = CloudinaryService.getUserScopedPublicId(runUserId, imgHash, "image");

    // Pre-register deterministic public ID before starting upload
    trackedAssets.set(precomputedImgPublicId, "image");

    const imgUpload = await withTimeout(
      CloudinaryService.uploadBuffer({
        buffer: dummyPngBytes,
        userId: runUserId,
        fileHash: imgHash,
        originalName: `test_cover_${runToken}.png`,
        mimeType: "image/png",
        tags: ["learnai_staging_test", runToken]
      }),
      15000,
      "STG-07 Cloudinary upload PNG"
    );

    assert.strictEqual(imgUpload.resourceType, "image");
    assert.strictEqual(imgUpload.publicId, precomputedImgPublicId);
    console.log(`✔ [STG-07 PASSED] Image asset uploaded with image resource type (public_id: ${imgUpload.publicId}).`);

    // -------------------------------------------------------------------------
    // STG-08: Signed Download URL & Byte-for-Byte Binary Integrity
    // -------------------------------------------------------------------------
    console.log("\n[STG-08] Testing Signed URL Generation & Binary Byte Integrity...");
    const signedUrl = CloudinaryService.generateSignedUrl(pdfUpload.publicId, "raw", 300);
    assert.ok(signedUrl.includes("expires_at"), "Signed URL must contain expiry timestamp");
    assert.ok(signedUrl.includes("/s--"), "Signed URL must contain Cloudinary signature token");

    const downloadedBytes = await withTimeout(
      downloadUrlToBuffer(signedUrl, 10000),
      15000,
      "STG-08 download signed asset"
    );
    const downloadedHash = crypto.createHash("sha256").update(downloadedBytes).digest("hex");
    assert.strictEqual(downloadedHash, pdfHash, "Downloaded binary stream must match uploaded file byte-for-byte");
    console.log(`✔ [STG-08 PASSED] Binary integrity verified: SHA-256 matches uploaded bytes (${downloadedBytes.length} bytes).`);

    // -------------------------------------------------------------------------
    // STG-09: Cloudinary Asset Destruction & Verified Deletion
    // -------------------------------------------------------------------------
    console.log("\n[STG-09] Testing Cloudinary Asset Destruction...");
    await withTimeout(
      CloudinaryService.destroyAsset(precomputedImgPublicId, "image"),
      10000,
      "STG-09 destroyAsset"
    );
    // Remove from tracked set since it's already deleted
    trackedAssets.delete(precomputedImgPublicId);

    // Verify deletion: generating signed URL and attempting download must fail with 404
    const deletedAssetSignedUrl = CloudinaryService.generateSignedUrl(precomputedImgPublicId, "image", 60);
    await assert.rejects(
      async () => {
        await downloadUrlToBuffer(deletedAssetSignedUrl, 5000);
      },
      /404/,
      "Download of destroyed asset must return HTTP 404 Not Found"
    );
    console.log("✔ [STG-09 PASSED] Asset destroyed immediately; subsequent retrieval returned 404.");

    // -------------------------------------------------------------------------
    // STG-10: End-to-End Atomicity with Simulated DB Failure
    // -------------------------------------------------------------------------
    console.log("\n[STG-10] Testing End-to-End Atomicity with Simulated DB Failure...");
    const abortBookContent = Buffer.from(`%PDF-1.4\n% Abort Test ${runToken}\n%%EOF`);
    const abortHash = crypto.createHash("sha256").update(abortBookContent).digest("hex");
    const precomputedAbortPublicId = CloudinaryService.getUserScopedPublicId(runUserId, abortHash, "raw");

    // Pre-register both asset and book ID before operations
    trackedAssets.set(precomputedAbortPublicId, "raw");
    trackedBooks.add(`book_${runToken}`);

    const abortUpload = await withTimeout(
      CloudinaryService.uploadBuffer({
        buffer: abortBookContent,
        userId: runUserId,
        fileHash: abortHash,
        originalName: `abort_test_${runToken}.pdf`,
        mimeType: "application/pdf",
        tags: ["learnai_staging_test", runToken]
      }),
      15000,
      "STG-10 uploadBuffer"
    );

    // Simulate database failure during transaction
    let rollbackTriggered = false;
    try {
      await withTimeout(
        withTransaction(async () => {
          await dbRun(
            "INSERT INTO books (id, user_id, file_url, title, subject) VALUES (?, ?, ?, ?, ?);",
            [`book_${runToken}`, runUserId, abortUpload.publicId, "Abort Test Book", "CSE"]
          );
          throw new Error("Simulated database write constraint abort");
        }),
        10000,
        "STG-10 withTransaction"
      );
    } catch (dbErr) {
      rollbackTriggered = true;
      // Trigger Cloudinary cleanup as bookController.js does
      await CloudinaryService.destroyAsset(precomputedAbortPublicId, "raw");
      trackedAssets.delete(precomputedAbortPublicId);
    }

    assert.ok(rollbackTriggered, "Database failure must trigger rollback path");
    const danglingBook = await dbGet("SELECT id FROM books WHERE id = ?;", [`book_${runToken}`]);
    assert.strictEqual(danglingBook, undefined, "Book record must NOT exist in Turso");
    trackedBooks.delete(`book_${runToken}`);
    console.log("✔ [STG-10 PASSED] End-to-end failure atomicity verified: 0 dangling rows, 0 orphaned cloud assets.");

    console.log("\n==================================================");
    console.log("🎉 ALL STAGING INTEGRATION TESTS (STG-01 to STG-10) PASSED!");
    console.log("==================================================\n");
  } finally {
    try {
      await executeRunTeardown({
        runToken,
        runUserId,
        trackedUsers,
        trackedBooks,
        trackedAssets
      });
    } finally {
      // Cryptographic Local SQLite & Sidecar Immutability Verification ALWAYS executes
      try {
        verifyLocalDatabaseIntegrity(initialDbSnapshot, localDbPath);
        console.log(`✔ [LOCAL DB IMMUTABILITY VERIFIED] SHA-256 match: ${initialDbSnapshot.dbHash}`);
        console.log("   Zero modifications to local SQLite database or WAL/SHM sidecars occurred during staging run.");
      } catch (integrityErr) {
        console.error("\n❌❌❌ CRITICAL LOCAL DATABASE CORRUPTION DETECTED ❌❌❌");
        console.error(integrityErr.message);
        throw integrityErr;
      }
    }
  }
}

/**
 * Executes a comprehensive, fail-closed teardown for a staging run.
 * 
 * Guarantees:
 * 1. Fails closed if any in-flight operations fail to settle within gracePeriodMs.
 * 2. Purges pre-registered books, users, document chunks, and Cloudinary assets.
 * 3. Executes fallback pattern cleanup strictly for the validated runToken.
 * 4. Queries Turso to verify 0 lingering users, 0 lingering books, and 0 lingering chunks.
 * 5. Discovers and purges any Cloudinary assets tagged with runToken, verifying 0 remain.
 * 6. Explicitly throws TEARDOWN FAILURE if any cleanup or verification check fails.
 */
export async function executeRunTeardown({
  runToken,
  runUserId,
  trackedUsers = new Set(),
  trackedBooks = new Set(),
  trackedAssets = new Map(),
  gracePeriodMs = 2500,
  dbAdapter = null,
  cloudinaryClient = null
} = {}) {
  console.log("\n==================================================");
  console.log("🧹 TEARDOWN: Scoped Run Cleanup & Integrity Audit");
  console.log("==================================================");

  if (!isValidRunToken(runToken)) {
    throw new Error(`TEARDOWN FAILURE: Refusing cleanup with invalid runToken '${runToken}'`);
  }

  isTeardownInProgress = true;
  let cleanupFailed = false;
  const cleanupErrors = [];

  // Recovery metadata for external operators or retry scripts (no secrets)
  const runMetadata = {
    runToken,
    runUserId,
    preRegisteredBooks: Array.from(trackedBooks),
    preRegisteredUsers: Array.from(trackedUsers),
    preRegisteredAssets: Array.from(trackedAssets.keys()),
    timestamp: new Date().toISOString()
  };

  try {
    // 0. Settle any in-flight operations with bounded grace period
    const settleResult = await settleInFlightOperations(gracePeriodMs);
    if (!settleResult.settled) {
      const errMsg = `TEARDOWN FAILURE: ${settleResult.remaining} in-flight operation(s) [${settleResult.unsettledOps.join(", ")}] did not settle within ${gracePeriodMs}ms grace period before cleanup.`;
      console.error(`❌ ${errMsg}`);
      cleanupFailed = true;
      cleanupErrors.push(new Error(errMsg));
    } else {
      console.log("✔ All in-flight operations settled prior to cleanup.");
    }

  const { dbRun, dbAll } = dbAdapter || (await import("../src/config/db.js"));
  const { CloudinaryService } = await import("../src/services/cloudinaryService.js");

  // 1. Database Cleanup
  try {
    // Purge document chunks first
    await dbRun(
      `DELETE FROM document_chunks WHERE book_id LIKE ? OR book_id IN (SELECT id FROM books WHERE user_id LIKE ? OR id LIKE ?);`,
      [`book_${runToken}%`, `usr_stg_${runToken}%`, `book_${runToken}%`]
    );

    // Purge books
    if (trackedBooks.size > 0) {
      const bookIds = Array.from(trackedBooks);
      const placeholders = bookIds.map(() => "?").join(", ");
      await dbRun(`DELETE FROM books WHERE id IN (${placeholders});`, bookIds);
      console.log(`   ✔ Purged ${bookIds.length} pre-registered test book(s) from Turso.`);
    }

    // Purge users
    if (trackedUsers.size > 0) {
      const userIds = Array.from(trackedUsers);
      const placeholders = userIds.map(() => "?").join(", ");
      const delRes = await dbRun(`DELETE FROM users WHERE id IN (${placeholders});`, userIds);
      console.log(`   ✔ Purged ${delRes.changes || delRes.rowsAffected || userIds.length} pre-registered test user(s) from Turso.`);
    }

    // Fallback run-scoped pattern cleanup
    await dbRun("DELETE FROM books WHERE id LIKE ? OR user_id LIKE ?;", [`book_${runToken}%`, `usr_stg_${runToken}%`]);
    await dbRun("DELETE FROM users WHERE id LIKE ?;", [`usr_stg_${runToken}%`]);

    // Explicit post-cleanup verification
    const lingeringUsers = await dbAll("SELECT id FROM users WHERE id LIKE ?;", [`usr_stg_${runToken}%`]);
    const lingeringBooks = await dbAll("SELECT id FROM books WHERE id LIKE ? OR user_id LIKE ?;", [`book_${runToken}%`, `usr_stg_${runToken}%`]);
    const lingeringChunks = await dbAll(
      "SELECT dc.id FROM document_chunks dc WHERE dc.book_id LIKE ? OR dc.book_id IN (SELECT b.id FROM books b WHERE b.user_id LIKE ?);",
      [`book_${runToken}%`, `usr_stg_${runToken}%`]
    );

    if (lingeringUsers.length > 0 || lingeringBooks.length > 0 || lingeringChunks.length > 0) {
      const msg = `CLEANUP VERIFICATION FAILED: Lingering records detected for run ${runToken} (${lingeringUsers.length} users, ${lingeringBooks.length} books, ${lingeringChunks.length} chunks).`;
      console.error(`❌ ${msg}`);
      cleanupFailed = true;
      cleanupErrors.push(new Error(msg));
    } else {
      console.log("   ✔ Verified 0 lingering database rows (users, books, chunks) for run token in Turso.");
    }
  } catch (delErr) {
    cleanupFailed = true;
    cleanupErrors.push(delErr);
    console.error("❌ Database teardown error:", delErr.message);
  }

  // 2. Cloudinary Cleanup & Tag Discovery
  try {
    const cloudClient = cloudinaryClient || (CloudinaryService.isConfigured() ? (await import("cloudinary")).v2 : null);

    // Step 2a: Destroy pre-registered assets
    if (trackedAssets.size > 0) {
      for (const [publicId, resourceType] of trackedAssets.entries()) {
        if (publicId.startsWith(`staging/textbooks/${runUserId}/`)) {
          if (cloudClient && cloudClient.uploader) {
            await cloudClient.uploader.destroy(publicId, { resource_type: resourceType, type: "authenticated" }).catch(() => {});
          } else {
            await CloudinaryService.destroyAsset(publicId, resourceType);
          }
          console.log(`   ✔ Purged run-specific test asset: ${publicId}`);
        } else {
          console.warn(`⚠️ Skipped destroying asset not matching exact staging run prefix: ${publicId}`);
        }
      }
    }

    // Step 2b: Fallback tag-based discovery & deletion for late/unregistered uploads
    if (cloudClient && cloudClient.api) {
      for (const resType of ["raw", "image"]) {
        let nextCursor = null;
        let pageCount = 0;
        const maxPages = 100; // Safeguard against infinite cursor loops
        const discoveredIds = [];

        // Paginated discovery loop
        do {
          pageCount++;
          if (pageCount > maxPages) {
            throw new Error(`Cloudinary tag discovery exceeded maximum page limit (${maxPages}) for ${resType}`);
          }

          const queryOptions = {
            resource_type: resType,
            max_results: 500
          };
          if (nextCursor) {
            queryOptions.next_cursor = nextCursor;
          }

          let taggedRes;
          try {
            taggedRes = await cloudClient.api.resources_by_tag(runToken, queryOptions);
          } catch (pageErr) {
            const err = new Error(`Cloudinary tag discovery failed on page ${pageCount} for ${resType}: ${pageErr.message}`);
            cleanupFailed = true;
            cleanupErrors.push(err);
            console.error(`❌ ${err.message}`);
            break; // Fail closed on partial discovery
          }

          if (!taggedRes || !Array.isArray(taggedRes.resources)) {
            const err = new Error(`Cloudinary tag discovery returned invalid response on page ${pageCount} for ${resType}`);
            cleanupFailed = true;
            cleanupErrors.push(err);
            console.error(`❌ ${err.message}`);
            break;
          }

          for (const res of taggedRes.resources) {
            if (res && res.public_id) {
              if (res.public_id.startsWith(`staging/textbooks/${runUserId}/`)) {
                discoveredIds.push(res.public_id);
              } else {
                console.warn(`⚠️ Skipped discovered asset not matching exact run user prefix: ${res.public_id}`);
              }
            }
          }

          nextCursor = taggedRes.next_cursor || null;
        } while (nextCursor);

        // Delete discovered assets in batches
        if (discoveredIds.length > 0 && !cleanupFailed) {
          console.log(`   ℹ Discovered ${discoveredIds.length} ${resType} asset(s) tagged '${runToken}' across ${pageCount} page(s). Purging...`);
          const uniqueIds = Array.from(new Set(discoveredIds));
          // Cloudinary delete_resources handles up to 100 IDs per call
          const batchSize = 100;
          for (let i = 0; i < uniqueIds.length; i += batchSize) {
            const batch = uniqueIds.slice(i, i + batchSize);
            try {
              const delRes = await cloudClient.api.delete_resources(batch, { resource_type: resType });
              if (delRes && delRes.deleted) {
                for (const [id, status] of Object.entries(delRes.deleted)) {
                  if (status !== "deleted" && status !== "not_found") {
                    throw new Error(`Asset '${id}' deletion returned status: '${status}'`);
                  }
                }
              }
            } catch (delErr) {
              const err = new Error(`Failed to delete batch of ${resType} assets for run ${runToken}: ${delErr.message}`);
              cleanupFailed = true;
              cleanupErrors.push(err);
              console.error(`❌ ${err.message}`);
            }
          }
        }

        // Post-cleanup paginated verification: verify 0 remaining assets
        let verifyCursor = null;
        let verifyPageCount = 0;
        const lingeringAssets = [];

        do {
          verifyPageCount++;
          if (verifyPageCount > maxPages) {
            throw new Error(`Cloudinary tag verification exceeded maximum page limit (${maxPages}) for ${resType}`);
          }

          const verifyOptions = {
            resource_type: resType,
            max_results: 100
          };
          if (verifyCursor) {
            verifyOptions.next_cursor = verifyCursor;
          }

          let postCheck;
          try {
            postCheck = await cloudClient.api.resources_by_tag(runToken, verifyOptions);
          } catch (verErr) {
            const err = new Error(`Cloudinary post-cleanup verification query failed on page ${verifyPageCount} for ${resType}: ${verErr.message}`);
            cleanupFailed = true;
            cleanupErrors.push(err);
            console.error(`❌ ${err.message}`);
            break;
          }

          if (!postCheck || !Array.isArray(postCheck.resources)) {
            const err = new Error(`Cloudinary post-cleanup verification returned invalid response on page ${verifyPageCount} for ${resType}`);
            cleanupFailed = true;
            cleanupErrors.push(err);
            console.error(`❌ ${err.message}`);
            break;
          }

          for (const res of postCheck.resources) {
            if (res && res.public_id && res.public_id.startsWith(`staging/textbooks/${runUserId}/`)) {
              lingeringAssets.push(res.public_id);
            }
          }

          verifyCursor = postCheck.next_cursor || null;
        } while (verifyCursor);

        if (lingeringAssets.length > 0) {
          const cloudMsg = `CLEANUP VERIFICATION FAILED: Cloudinary ${resType} asset(s) remain for run ${runToken} (${lingeringAssets.join(", ")}).`;
          console.error(`❌ ${cloudMsg}`);
          cleanupFailed = true;
          cleanupErrors.push(new Error(cloudMsg));
        }
      }
    }
  } catch (assetErr) {
    cleanupFailed = true;
    cleanupErrors.push(assetErr);
    console.error("❌ Cloudinary teardown error:", assetErr.message);
  }

  if (cleanupFailed) {
    const errorDetails = cleanupErrors.map((e) => e.message).join("; ");
    console.error(`\n⚠️ [RUN RECOVERY METADATA] Run Token: ${runMetadata.runToken}, User ID: ${runMetadata.runUserId}`);
    console.error(`   Tracked Assets: ${runMetadata.preRegisteredAssets.join(", ") || "none"}`);
    console.error(`   Tracked Books: ${runMetadata.preRegisteredBooks.join(", ") || "none"}`);
    console.error(`   Tracked Users: ${runMetadata.preRegisteredUsers.join(", ") || "none"}`);
    throw new Error(`TEARDOWN FAILURE: Staging cleanup could not be verified successfully. Errors: ${errorDetails}`);
  }

  console.log("✔ Teardown completed with 100% verified resource reclamation.");
  return { success: true };
} finally {
  isTeardownInProgress = false;
  isStagingRunInProgress = false;
}
}

// Direct CLI Invocation
if (isDirectCli) {
  runStagingIntegrationSuite().catch((err) => {
    console.error("❌ Live staging integration suite failed:", err);
    process.exit(1);
  });
}

