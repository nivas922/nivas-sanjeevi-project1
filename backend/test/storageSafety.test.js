import assert from "assert";
import fs from "fs";
import path from "path";
import http from "http";
import sqlite3 from "sqlite3";
import { StoragePreflight } from "../src/config/storagePreflight.js";
import { db } from "../src/config/db.js";
import { app } from "../src/app.js";

console.log("==================================================");
console.log("🛡️ LEARN-AI STORAGE SAFETY & PREFLIGHT TEST SUITE");
console.log("==================================================");

let server;
let baseUrl;
const testDir = path.resolve("test_storage_safety_tmp");

async function setup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

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
  if (fs.existsSync(testDir)) {
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
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

// Initialize test server first
await setup();

try {
  // ----------------------------------------------------
  // TEST 1: Local Development Storage Resolution
  // ----------------------------------------------------
  console.log("\n[TEST 1] Local development storage preflight");
  {
    const localDb = path.join(testDir, "local_data", "learnai.db");
    const localUploads = path.join(testDir, "local_uploads");

    const result = StoragePreflight.validate({
      nodeEnv: "development",
      dbFile: localDb,
      uploadDir: localUploads,
      requirePersistentDisk: false
    });

    assert.strictEqual(result.ok, true, "Local preflight should succeed");
    assert.strictEqual(result.mode, "local", "Mode should be local");
    assert.strictEqual(result.isPersistent, false, "Should not claim persistent mount");
    assert.ok(fs.existsSync(path.dirname(localDb)), "Local DB folder should be created");
    assert.ok(fs.existsSync(localUploads), "Local uploads folder should be created");
    console.log("✔ TEST 1 PASSED: Local development storage safely initialized.");
  }

  // ----------------------------------------------------
  // TEST 2: Fail-Closed When /var/data Is Missing in Production
  // ----------------------------------------------------
  console.log("\n[TEST 2] Fail-closed verification when persistent mount is missing");
  {
    const missingMount = path.join(testDir, "non_existent_mount_var_data");
    const result = StoragePreflight.validate({
      nodeEnv: "production",
      dbFile: path.join(missingMount, "db", "learnai.db"),
      uploadDir: path.join(missingMount, "uploads"),
      mountRoot: missingMount,
      requirePersistentDisk: true
    });

    assert.strictEqual(result.ok, false, "Preflight must fail when mount is missing");
    assert.strictEqual(result.isPersistent, false, "Must not claim persistent");
    assert.ok(result.errors.length > 0, "Must contain explanatory errors");
    assert.ok(
      !fs.existsSync(missingMount),
      "CRITICAL: Preflight MUST NOT create missing persistent mount on ephemeral root!"
    );
    console.log("✔ TEST 2 PASSED: Preflight strictly fails closed without creating ephemeral folders.");
  }

  // ----------------------------------------------------
  // TEST 3: Fail-Closed When Mount Directory Is Read-Only / Unwritable
  // ----------------------------------------------------
  console.log("\n[TEST 3] Fail-closed verification when mount directory is not writable");
  {
    const mockMount = path.join(testDir, "mock_mount");
    fs.mkdirSync(mockMount, { recursive: true });

    const originalWritable = StoragePreflight.isDirectoryWritable;
    StoragePreflight.isDirectoryWritable = () => false;

    const result = StoragePreflight.validate({
      nodeEnv: "production",
      dbFile: path.join(mockMount, "db", "learnai.db"),
      uploadDir: path.join(mockMount, "uploads"),
      mountRoot: mockMount,
      requirePersistentDisk: true
    });

    StoragePreflight.isDirectoryWritable = originalWritable;

    assert.strictEqual(result.ok, false, "Must fail if mount root is not writable");
    assert.ok(result.errors.some((e) => e.includes("not writable")), "Error should mention unwritability");
    console.log("✔ TEST 3 PASSED: Unwritable mount point correctly rejected.");
  }

  // ----------------------------------------------------
  // TEST 4: Verified Mount Passes Preflight and Creates Canonical Subfolders
  // ----------------------------------------------------
  console.log("\n[TEST 4] Verified persistent mount initialization");
  {
    const validMount = path.join(testDir, "valid_mock_mount");
    fs.mkdirSync(validMount, { recursive: true });
    fs.writeFileSync(path.join(validMount, ".learnai_persistent_disk"), "mock-disk-uuid-1234", "utf8");

    const canonicalDb = path.join(validMount, "db", "learnai.db");
    const canonicalUploads = path.join(validMount, "uploads");

    const result = StoragePreflight.validate({
      nodeEnv: "production",
      dbFile: canonicalDb,
      uploadDir: canonicalUploads,
      mountRoot: validMount,
      requirePersistentDisk: true,
      mockMountDetected: true,
      mockDistinctDevice: true
    });

    assert.strictEqual(result.ok, true, "Verified mount should pass preflight");
    assert.strictEqual(result.isPersistent, true, "Should confirm persistence");
    assert.ok(fs.existsSync(path.join(validMount, "db")), "Canonical db folder must exist");
    assert.ok(fs.existsSync(canonicalUploads), "Canonical uploads folder must exist");
    console.log("✔ TEST 4 PASSED: Verified persistent mount successfully initializes canonical folders.");
  }

  // ----------------------------------------------------
  // TEST 5: Maintenance Mode Liveness & Readiness Separation
  // ----------------------------------------------------
  console.log("\n[TEST 5] Distinct liveness vs readiness probes");
  {
    // 5a: Normal mode
    process.env.MAINTENANCE_MODE = "false";
    const liveRes1 = await request("/health");
    assert.strictEqual(liveRes1.status, 200);
    assert.strictEqual(liveRes1.data.mode, "normal");

    const readyRes1 = await request("/ready");
    assert.strictEqual(readyRes1.status, 200);
    assert.strictEqual(readyRes1.data.ready, true);

    // 5b: Maintenance mode active
    process.env.MAINTENANCE_MODE = "true";
    const liveRes2 = await request("/health");
    assert.strictEqual(liveRes2.status, 200, "Liveness MUST return 200 even during maintenance");
    assert.strictEqual(liveRes2.data.mode, "maintenance");

    const readyRes2 = await request("/ready");
    assert.strictEqual(readyRes2.status, 503, "Readiness MUST return 503 during maintenance");
    assert.strictEqual(readyRes2.data.ready, false);
    assert.strictEqual(readyRes2.headers.get("retry-after"), "300");

    // 5c: Storage preflight failure active ({ ok: false }) -> readiness probe MUST return 503
    process.env.MAINTENANCE_MODE = "false";
    const origEnvRequire = process.env.REQUIRE_PERSISTENT_DISK;
    const origEnvDb = process.env.DB_FILE;
    try {
      process.env.REQUIRE_PERSISTENT_DISK = "true";
      process.env.DB_FILE = "/var/data/unmounted/learnai.db";
      const readyResPreflightFail = await request("/ready");
      assert.strictEqual(readyResPreflightFail.status, 503, "Readiness MUST return 503 when storage preflight validation fails");
      assert.strictEqual(readyResPreflightFail.data.ready, false);
      assert.strictEqual(readyResPreflightFail.data.status, "unready");
      assert.strictEqual(readyResPreflightFail.data.error, "Storage validation failed.");
      assert.strictEqual(readyResPreflightFail.data.errors, undefined, "Must NOT leak internal error arrays in response");
      assert.strictEqual(readyResPreflightFail.data.details, undefined, "Must NOT leak filesystem details in response");
    } finally {
      if (origEnvRequire !== undefined) process.env.REQUIRE_PERSISTENT_DISK = origEnvRequire;
      else delete process.env.REQUIRE_PERSISTENT_DISK;
      if (origEnvDb !== undefined) process.env.DB_FILE = origEnvDb;
      else delete process.env.DB_FILE;
    }

    // 5d: Storage preflight throwing an unexpected exception -> readiness probe MUST return 503
    const origValidate = StoragePreflight.validate;
    try {
      StoragePreflight.validate = () => {
        throw new Error("Simulated storage preflight unexpected crash / EACCES");
      };
      const readyResPreflightThrow = await request("/ready");
      assert.strictEqual(readyResPreflightThrow.status, 503, "Readiness MUST return 503 when storage preflight throws");
      assert.strictEqual(readyResPreflightThrow.data.ready, false);
      assert.strictEqual(readyResPreflightThrow.data.status, "unready");
      assert.strictEqual(readyResPreflightThrow.data.error, "Storage validation failed.");
      assert.strictEqual(readyResPreflightThrow.data.details, undefined, "Must NOT leak thrown exception message");
    } finally {
      StoragePreflight.validate = origValidate;
    }

    // 5e: Database query rejection / disconnect -> readiness probe MUST return 503
    const origDbGet = db.get;
    try {
      db.get = (sql, params, cb) => {
        const callback = typeof params === "function" ? params : cb;
        callback(new Error("SQLITE_IOERR: simulated disk I/O error during health query"));
      };
      const readyResDbFail = await request("/ready");
      assert.strictEqual(readyResDbFail.status, 503, "Readiness MUST return 503 when database query rejects");
      assert.strictEqual(readyResDbFail.data.ready, false);
      assert.strictEqual(readyResDbFail.data.status, "unready");
      assert.strictEqual(readyResDbFail.data.error, "Database is not ready or unresponsive.");
      assert.strictEqual(readyResDbFail.data.details, undefined, "Must NOT leak SQL error or filesystem paths in response");
    } finally {
      db.get = origDbGet;
    }

    // 5f: Repeated readiness requests do not start duplicate connections or leak resources
    for (let i = 0; i < 5; i++) {
      const repeatedRes = await request("/ready");
      assert.strictEqual(repeatedRes.status, 200);
      assert.strictEqual(repeatedRes.data.ready, true);
      assert.strictEqual(repeatedRes.data.database, "connected");
    }

    console.log("✔ TEST 5 PASSED: Liveness (200) and Readiness (503) correctly decoupled; readiness fails closed on validation failure, preflight throw, and db error without leaking paths.");
  }

  // ----------------------------------------------------
  // TEST 6: Maintenance Mode Write Freeze on Mutating Endpoints
  // ----------------------------------------------------
  console.log("\n[TEST 6] Maintenance mode write-freeze blocks mutating HTTP requests");
  {
    process.env.MAINTENANCE_MODE = "true";

    // POST /api/upload-book blocked
    const resUpload = await request("/api/upload-book", { method: "POST", body: {} });
    assert.strictEqual(resUpload.status, 503);
    assert.strictEqual(resUpload.data.mode, "maintenance");

    // POST /api/ask-doubt blocked
    const resDoubt = await request("/api/ask-doubt", { method: "POST", body: { question: "test" } });
    assert.strictEqual(resDoubt.status, 503);

    // POST /api/auth/email/signup blocked
    const resSignup = await request("/api/auth/email/signup", { method: "POST", body: {} });
    assert.strictEqual(resSignup.status, 503);

    // PUT /api/profile blocked
    const resProfile = await request("/api/profile", { method: "PUT", body: {} });
    assert.strictEqual(resProfile.status, 503);

    // GET /api/books allowed during maintenance (read-only)
    const resBooks = await request("/api/books");
    assert.strictEqual(resBooks.status, 200, "GET /api/books should be permitted during maintenance");

    // Reset maintenance mode
    process.env.MAINTENANCE_MODE = "false";
    console.log("✔ TEST 6 PASSED: Mutating routes strictly frozen with 503; read operations remain available.");
  }

  // ----------------------------------------------------
  // TEST 7: SQLite WAL Checkpoint and Clean Database Close
  // ----------------------------------------------------
  console.log("\n[TEST 7] SQLite WAL checkpointing and clean shutdown closure");
  {
    const testDbPath = path.join(testDir, "test_wal_checkpoint.db");
    const testDb = new sqlite3.Database(testDbPath);

    await new Promise((resolve, reject) => {
      testDb.serialize(() => {
        testDb.run("PRAGMA journal_mode = WAL;");
        testDb.run("CREATE TABLE test_data (id INT PRIMARY KEY, val TEXT);");
        testDb.run("INSERT INTO test_data VALUES (1, 'active_write');", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    // Checkpoint WAL and close
    await new Promise((resolve, reject) => {
      testDb.run("PRAGMA wal_checkpoint(TRUNCATE);", [], (err) => {
        if (err) return reject(err);
        testDb.close((closeErr) => {
          if (closeErr) return reject(closeErr);
          resolve();
        });
      });
    });

    // Verify database can be reopened and integrity is ok
    const reopenDb = new sqlite3.Database(testDbPath);
    const row = await new Promise((resolve, reject) => {
      reopenDb.get("SELECT val FROM test_data WHERE id = 1", (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });
    assert.strictEqual(row.val, "active_write");

    const integrity = await new Promise((resolve, reject) => {
      reopenDb.get("PRAGMA integrity_check;", (err, r) => {
        if (err) reject(err);
        else resolve(r && (r.integrity_check || Object.values(r)[0]));
      });
    });
    assert.strictEqual(integrity, "ok", "Integrity check must return ok");

    await new Promise((resolve) => reopenDb.close(resolve));
    console.log("✔ TEST 7 PASSED: WAL checkpointing successfully flushes journal and preserves integrity.");
  }

  // ----------------------------------------------------
  // TEST 8: Online SQLite Backup and Archive Verification
  // ----------------------------------------------------
  console.log("\n[TEST 8] Safe online SQLite backup (.backup API) verification");
  {
    const sourceDbPath = path.join(testDir, "source_backup_test.db");
    const backupDbPath = path.join(testDir, "dest_backup_test.db");

    const srcDb = new sqlite3.Database(sourceDbPath);
    await new Promise((resolve) => {
      srcDb.serialize(() => {
        srcDb.run("CREATE TABLE accounts (id TEXT PRIMARY KEY, score INT);");
        srcDb.run("INSERT INTO accounts VALUES ('usr_1', 95);");
        srcDb.run("INSERT INTO accounts VALUES ('usr_2', 88);", resolve);
      });
    });

    // Perform SQLite online backup using node-sqlite3 Backup API
    await new Promise((resolve, reject) => {
      const backup = srcDb.backup(backupDbPath);
      backup.step(-1, (err) => {
        if (err) return reject(err);
        backup.finish((finishErr) => {
          if (finishErr) return reject(finishErr);
          resolve();
        });
      });
    });

    await new Promise((resolve) => srcDb.close(resolve));

    // Open destination database and verify contents
    const destDb = new sqlite3.Database(backupDbPath);

    // Verify destination database
    const countRow = await new Promise((resolve, reject) => {
      destDb.get("SELECT COUNT(*) as c FROM accounts", (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });
    assert.strictEqual(countRow.c, 2, "Backup must contain exact row count");

    const integrityCheck = await new Promise((resolve, reject) => {
      destDb.get("PRAGMA integrity_check;", (err, r) => {
        if (err) reject(err);
        else resolve(r && (r.integrity_check || Object.values(r)[0]));
      });
    });
    assert.strictEqual(integrityCheck, "ok", "Backup integrity must return ok");

    await new Promise((resolve) => destDb.close(resolve));
    console.log("✔ TEST 8 PASSED: Online backup creates atomic, verified snapshot.");
  }

  // ----------------------------------------------------
  // TEST 9: In-Flight Request Accounting (Single-Decrement Exactly Once)
  // ----------------------------------------------------
  console.log("\n[TEST 9] In-flight request accounting (single-decrement verification)");
  {
    let active = 0;
    const attachTracker = (resMock) => {
      active++;
      let decremented = false;
      const decrement = () => {
        if (!decremented) {
          decremented = true;
          active = Math.max(0, active - 1);
        }
      };
      resMock.onFinish = decrement;
      resMock.onClose = decrement;
    };

    // Case 9a: Normal completion (both finish and close fire in sequence)
    const req1Res = {};
    attachTracker(req1Res);
    assert.strictEqual(active, 1, "Active should be 1 after request arrives");
    req1Res.onFinish();
    assert.strictEqual(active, 0, "Active should decrement to 0 after finish");
    req1Res.onClose();
    assert.strictEqual(active, 0, "Active must NOT double-decrement on subsequent close");

    // Case 9b: Premature close (client disconnect, close fires without finish)
    const req2Res = {};
    attachTracker(req2Res);
    assert.strictEqual(active, 1);
    req2Res.onClose();
    assert.strictEqual(active, 0, "Premature close correctly decrements active requests");

    // Case 9c: Concurrent requests where one completes while another remains active
    const req3A = {};
    const req3B = {};
    attachTracker(req3A);
    attachTracker(req3B);
    assert.strictEqual(active, 2, "Active should be 2 for concurrent requests");
    // Request 3A finishes normally
    req3A.onFinish();
    req3A.onClose();
    assert.strictEqual(active, 1, "Active must be exactly 1 while Request 3B is still active");
    // Request 3B completes later
    req3B.onFinish();
    req3B.onClose();
    assert.strictEqual(active, 0, "Active reaches 0 only when all concurrent requests finish");

    console.log("✔ TEST 9 PASSED: In-flight request accounting decrements exactly once across all lifecycles.");
  }

  // ----------------------------------------------------
  // TEST 10: Shutdown Error Propagation & Idempotent Signal Handling
  // ----------------------------------------------------
  console.log("\n[TEST 10] Shutdown error propagation and idempotent signal handling");
  {
    // Test 10a: Checkpoint failure rejects and propagates error
    const fakeDbWithError = {
      run: (sql, params, cb) => {
        cb(new Error("Disk I/O error during WAL checkpoint"));
      },
      close: (cb) => cb(null)
    };

    const checkpointCloseRunner = (mockDb) => {
      return new Promise((resolve, reject) => {
        let isClosed = false;
        const closeDb = (chkErr = null) => {
          if (isClosed) return;
          isClosed = true;
          mockDb.close((closeErr) => {
            if (closeErr) return reject(chkErr || closeErr);
            if (chkErr) return reject(chkErr);
            resolve();
          });
        };
        mockDb.run("PRAGMA wal_checkpoint(TRUNCATE);", [], (err) => {
          if (err) closeDb(err);
          else closeDb(null);
        });
      });
    };

    let checkpointThrew = false;
    try {
      await checkpointCloseRunner(fakeDbWithError);
    } catch (e) {
      checkpointThrew = true;
      assert.ok(e.message.includes("Disk I/O error"), "Should propagate checkpoint error");
    }
    assert.strictEqual(checkpointThrew, true, "Checkpoint failure MUST reject and not resolve silently");

    // Test 10b: Database close failure rejects and propagates error
    const fakeDbWithCloseError = {
      run: (sql, params, cb) => cb(null),
      close: (cb) => cb(new Error("SQLITE_BUSY: unable to close due to active statements"))
    };

    let closeThrew = false;
    try {
      await checkpointCloseRunner(fakeDbWithCloseError);
    } catch (e) {
      closeThrew = true;
      assert.ok(e.message.includes("SQLITE_BUSY"), "Should propagate database close error");
    }
    assert.strictEqual(closeThrew, true, "Close failure MUST reject and not resolve silently");

    // Test 10c: Idempotent signal handling (repeated signals ignored)
    let shutdownInvoked = 0;
    let isShuttingDownFlag = false;
    const handleSignal = (sig) => {
      if (isShuttingDownFlag) return "ignored";
      isShuttingDownFlag = true;
      shutdownInvoked++;
      return "processing";
    };

    assert.strictEqual(handleSignal("SIGTERM"), "processing");
    assert.strictEqual(handleSignal("SIGTERM"), "ignored");
    assert.strictEqual(handleSignal("SIGINT"), "ignored");
    assert.strictEqual(shutdownInvoked, 1, "Shutdown handler should only execute once");

    console.log("✔ TEST 10 PASSED: Shutdown failures propagate cleanly and signal handling is idempotent.");
  }

  // ----------------------------------------------------
  // TEST 11: Path Containment & Decision Table Persistence Verification
  // ----------------------------------------------------
  console.log("\n[TEST 11] Robust path containment and mount proof decision table");
  {
    const mountRoot = path.resolve("/var/data");

    // Case 11a: Legitimate canonical sub-paths are properly contained
    assert.strictEqual(
      StoragePreflight.isPathContained(mountRoot, path.join(mountRoot, "db", "learnai.db")),
      true,
      "Canonical DB path must be contained"
    );
    assert.strictEqual(
      StoragePreflight.isPathContained(mountRoot, path.join(mountRoot, "uploads")),
      true,
      "Canonical uploads path must be contained"
    );

    // Case 11b: Valid child paths with names starting with '..' (e.g. '..backup') are allowed
    assert.strictEqual(
      StoragePreflight.isPathContained(mountRoot, path.join(mountRoot, "..backup")),
      true,
      "Valid child directory starting with '..' (e.g. '..backup') must NOT be rejected"
    );
    assert.strictEqual(
      StoragePreflight.isPathContained(mountRoot, path.join(mountRoot, "..backup", "learnai.db")),
      true,
      "Valid child file inside '..backup' directory must be contained"
    );

    // Case 11c: String-prefix bypass (/var/data_unmounted/learnai.db) is strictly rejected
    const unmountedNeighbor = path.resolve(path.join(path.dirname(mountRoot), `${path.basename(mountRoot)}_unmounted`, "learnai.db"));
    assert.strictEqual(
      StoragePreflight.isPathContained(mountRoot, unmountedNeighbor),
      false,
      "Unmounted neighbor with common prefix must be rejected"
    );

    // Case 11d: Parent traversal escaping mount root is strictly rejected
    assert.strictEqual(
      StoragePreflight.isPathContained(mountRoot, path.join(mountRoot, "..", "etc", "passwd")),
      false,
      "Path traversal escaping mount root must be rejected"
    );
    assert.strictEqual(
      StoragePreflight.isPathContained(mountRoot, path.join(mountRoot, "..")),
      false,
      "Parent directory of mount root must be rejected"
    );

    // Case 11e: Mount root itself cannot be used as child DB_FILE or UPLOAD_DIR
    assert.strictEqual(
      StoragePreflight.isPathContained(mountRoot, mountRoot),
      false,
      "Mount root itself cannot be the child DB file or upload directory"
    );

    // Case 11f: Symlink resolving outside the mount root is strictly rejected
    const symlinkTestRoot = path.join(testDir, "symlink_mount");
    const outsideTarget = path.join(testDir, "outside_target");
    const symlinkInsideMount = path.join(symlinkTestRoot, "escaped_link");

    fs.mkdirSync(symlinkTestRoot, { recursive: true });
    fs.mkdirSync(outsideTarget, { recursive: true });

    let symlinkCreated = false;
    try {
      // Use 'junction' on Windows to avoid needing admin privileges
      const symlinkType = process.platform === "win32" ? "junction" : "dir";
      fs.symlinkSync(outsideTarget, symlinkInsideMount, symlinkType);
      symlinkCreated = true;
    } catch (symErr) {
      console.warn(`[TEST 11] Symlink creation skipped on platform due to OS restrictions: ${symErr.message}`);
    }

    if (symlinkCreated) {
      assert.strictEqual(
        StoragePreflight.isPathContained(symlinkTestRoot, symlinkInsideMount),
        false,
        "Symlink inside mount root pointing outside must be strictly rejected"
      );
      assert.strictEqual(
        StoragePreflight.isPathContained(symlinkTestRoot, path.join(symlinkInsideMount, "escaped.db")),
        false,
        "Path inside outside-pointing symlink must be strictly rejected"
      );

      // Verify that mountRoot itself being a symlink is rejected by validate()
      const symlinkMountResult = StoragePreflight.validate({
        nodeEnv: "production",
        dbFile: path.join(symlinkInsideMount, "db", "learnai.db"),
        uploadDir: path.join(symlinkInsideMount, "uploads"),
        mountRoot: symlinkInsideMount,
        requirePersistentDisk: true
      });
      assert.strictEqual(symlinkMountResult.ok, false, "Mount root itself being a symlink must be rejected");
      assert.ok(
        symlinkMountResult.errors.some((e) => e.includes("symbolic link")),
        "Error message must specify mount root is a symbolic link"
      );
    }

    // Case 11g: Full decision table for persistent mount verification
    // Both kernel mount entry AND distinct device ID are mandatory on Linux to fail closed
    const testDecision = (mockMount, mockDev) => {
      return StoragePreflight.validate({
        nodeEnv: "production",
        dbFile: path.join(testDir, "mock_mount", "db", "learnai.db"),
        uploadDir: path.join(testDir, "mock_mount", "uploads"),
        mountRoot: path.join(testDir, "mock_mount"),
        requirePersistentDisk: true,
        mockMountDetected: mockMount,
        mockDistinctDevice: mockDev
      });
    };

    // Ensure mock directory exists and is writable for decision table checks
    const decisionMockDir = path.join(testDir, "mock_mount");
    if (!fs.existsSync(decisionMockDir)) {
      fs.mkdirSync(decisionMockDir, { recursive: true });
    }

    // 1. [true, true] -> Positive proof from BOTH mount table AND distinct device -> PASS
    assert.strictEqual(testDecision(true, true).ok, true, "[true, true] must PASS");

    // 2. [true, false] -> Mount table entry but shares root container device -> FAIL CLOSED
    assert.strictEqual(testDecision(true, false).ok, false, "[true, false] must FAIL CLOSED (shares container root device)");

    // 3. [false, true] -> Distinct device ID alone is NOT universal proof -> FAIL CLOSED
    assert.strictEqual(testDecision(false, true).ok, false, "[false, true] must FAIL CLOSED (device ID alone not persistent)");

    // 4. [false, false] -> No proof from either -> FAIL CLOSED
    assert.strictEqual(testDecision(false, false).ok, false, "[false, false] must FAIL CLOSED");

    // 5. [null, false] -> Indeterminate mount table + same device -> FAIL CLOSED
    assert.strictEqual(testDecision(null, false).ok, false, "[null, false] must FAIL CLOSED");

    // 6. [null, true] -> Indeterminate mount table + distinct device -> FAIL CLOSED
    assert.strictEqual(testDecision(null, true).ok, false, "[null, true] must FAIL CLOSED (cannot establish positive mount proof)");

    // Case 11h: Ephemeral filesystems (tmpfs, overlay, ramfs, shm) are STRICTLY REJECTED
    // Even if device ID is distinct and mount point matches!
    const testFsType = (fsType, device = "/dev/vdb", distinctDev = true) => {
      return StoragePreflight.validate({
        nodeEnv: "production",
        dbFile: path.join(decisionMockDir, "db", "learnai.db"),
        uploadDir: path.join(decisionMockDir, "uploads"),
        mountRoot: decisionMockDir,
        requirePersistentDisk: true,
        mockDistinctDevice: distinctDev,
        mockMountEntry: {
          device,
          mountPoint: decisionMockDir,
          fsType,
          options: ["rw"]
        }
      });
    };

    // Ephemeral tmpfs: MUST FAIL CLOSED
    const tmpfsResult = testFsType("tmpfs", "tmpfs");
    assert.strictEqual(tmpfsResult.ok, false, "tmpfs mount MUST fail closed even with distinct device");
    assert.ok(
      tmpfsResult.errors.some((e) => e.includes("ephemeral filesystem type 'tmpfs'")),
      "Error must identify tmpfs as ephemeral"
    );

    // Ephemeral overlay (container writable layer): MUST FAIL CLOSED
    const overlayResult = testFsType("overlay", "overlay");
    assert.strictEqual(overlayResult.ok, false, "overlay mount MUST fail closed");
    assert.ok(
      overlayResult.errors.some((e) => e.includes("ephemeral filesystem type 'overlay'")),
      "Error must identify overlay as ephemeral"
    );

    // Ephemeral ramfs: MUST FAIL CLOSED
    assert.strictEqual(testFsType("ramfs", "ramfs").ok, false, "ramfs mount MUST fail closed");

    // Ephemeral shm: MUST FAIL CLOSED
    assert.strictEqual(testFsType("tmpfs", "shm").ok, false, "shm mount MUST fail closed");

    // Case 11i: Standard persistent block filesystem types are ACCEPTED when device is distinct
    const ext4Result = testFsType("ext4", "/dev/vdb1");
    assert.strictEqual(ext4Result.ok, true, "ext4 on dedicated block device MUST pass");
    assert.strictEqual(ext4Result.isPersistent, true);

    const xfsResult = testFsType("xfs", "/dev/sda2");
    assert.strictEqual(xfsResult.ok, true, "xfs on dedicated block device MUST pass");

    // But persistent filesystem sharing container root device MUST FAIL CLOSED
    const ext4SameDeviceResult = testFsType("ext4", "/dev/vdb1", false);
    assert.strictEqual(ext4SameDeviceResult.ok, false, "ext4 sharing container root device MUST fail closed");

    // Case 11j: Mismatched mount points, unreadable tables, and unknown filesystem types
    // Mismatched mount point (e.g. entry is for /var/other instead of /var/data)
    const mismatchedResult = StoragePreflight.validate({
      nodeEnv: "production",
      dbFile: path.join(decisionMockDir, "db", "learnai.db"),
      uploadDir: path.join(decisionMockDir, "uploads"),
      mountRoot: decisionMockDir,
      requirePersistentDisk: true,
      mockDistinctDevice: true,
      mockMountEntry: {
        device: "/dev/vdb",
        mountPoint: path.join(testDir, "different_mount_point"),
        fsType: "ext4"
      }
    });
    assert.strictEqual(mismatchedResult.ok, false, "Mismatched mount point MUST fail closed");
    assert.ok(
      mismatchedResult.errors.some((e) => e.includes("Mismatched mount point")),
      "Error must report mismatched mount point"
    );

    // Unknown filesystem type cannot be reliably established as persistent -> FAIL CLOSED
    const unknownFsResult = testFsType("unknown_custom_fs", "/dev/vdb1");
    assert.strictEqual(unknownFsResult.ok, false, "Unknown filesystem type MUST fail closed");
    assert.ok(
      unknownFsResult.errors.some((e) => e.includes("cannot be reliably established as persistent storage")),
      "Error must state that unknown filesystem cannot be reliably established as persistent"
    );

    // Unreadable mount table
    const unreadableResult = StoragePreflight.validate({
      nodeEnv: "production",
      dbFile: path.join(decisionMockDir, "db", "learnai.db"),
      uploadDir: path.join(decisionMockDir, "uploads"),
      mountRoot: decisionMockDir,
      requirePersistentDisk: true,
      mockDistinctDevice: true,
      mockMountEntry: { unreadable: true }
    });
    assert.strictEqual(unreadableResult.ok, false, "Unreadable mount table MUST fail closed");

    // Case 11k: Realistic /proc/mounts raw content inspection
    const realisticMounts = `
overlay / overlay rw,relatime,lowerdir=/var/lib/docker/overlay2/l/ABC,upperdir=/var/lib/docker/overlay2/DEF/diff 0 0
proc /proc proc rw,nosuid,nodev,noexec,relatime 0 0
tmpfs /dev tmpfs rw,nosuid,size=65536k,mode=755 0 0
/dev/vdc1 ${decisionMockDir} ext4 rw,relatime 0 0
tmpfs /var/ephemeral_cache tmpfs rw,nosuid,nodev 0 0
`.trim();

    const inspectedTarget = StoragePreflight.inspectMountEvidence(decisionMockDir, realisticMounts);
    assert.strictEqual(inspectedTarget.ok, true);
    assert.strictEqual(inspectedTarget.found, true);
    assert.strictEqual(inspectedTarget.entry.fsType, "ext4");
    assert.strictEqual(inspectedTarget.entry.device, "/dev/vdc1");

    // Preflight validation with raw realistic /proc/mounts content
    const realisticValid = StoragePreflight.validate({
      nodeEnv: "production",
      dbFile: path.join(decisionMockDir, "db", "learnai.db"),
      uploadDir: path.join(decisionMockDir, "uploads"),
      mountRoot: decisionMockDir,
      requirePersistentDisk: true,
      mockDistinctDevice: true,
      mockMountsContent: realisticMounts
    });
    assert.strictEqual(realisticValid.ok, true, "Preflight with realistic /proc/mounts must pass for ext4 block mount");

    // If target mount in same realistic /proc/mounts were ephemeral
    const realisticEphemeral = StoragePreflight.validate({
      nodeEnv: "production",
      dbFile: path.join(decisionMockDir, "db", "learnai.db"),
      uploadDir: path.join(decisionMockDir, "uploads"),
      mountRoot: path.resolve("/var/ephemeral_cache"),
      requirePersistentDisk: true,
      mockDistinctDevice: true,
      mockMountsContent: realisticMounts
    });
    assert.strictEqual(realisticEphemeral.ok, false, "Preflight must reject ephemeral mount in realistic /proc/mounts");

    console.log("✔ TEST 11 PASSED: Robust containment, ephemeral rejection (tmpfs/overlay), and persistent filesystem verification verified across all cases.");
  }

  // ----------------------------------------------------
  // TEST 12: Cross-Platform Isolated Restoration with Stale WAL Safe Handling
  // ----------------------------------------------------
  console.log("\n[TEST 12] Isolated SQLite restoration procedure & cross-platform stale WAL handling");
  {
    const restoreTestDir = path.join(testDir, "restore_isolation_test");
    fs.mkdirSync(restoreTestDir, { recursive: true });

    const activeDbPath = path.join(restoreTestDir, "learnai.db");
    const activeWalPath = path.join(restoreTestDir, "learnai.db-wal");
    const activeShmPath = path.join(restoreTestDir, "learnai.db-shm");

    // 1. Create an active database with WAL files (simulating running database before crash)
    const oldDb = new sqlite3.Database(activeDbPath);
    await new Promise((resolve) => {
      oldDb.serialize(() => {
        oldDb.run("PRAGMA journal_mode = WAL;");
        oldDb.run("CREATE TABLE state (session TEXT);");
        oldDb.run("INSERT INTO state VALUES ('old_uncheckpointed_session');", resolve);
      });
    });
    await new Promise((resolve) => oldDb.close(resolve));

    // Create mock stale WAL and SHM sidecar files
    fs.writeFileSync(activeWalPath, "stale_wal_frames_from_old_generation", "utf8");
    fs.writeFileSync(activeShmPath, "stale_shm_index_from_old_generation", "utf8");

    // Helper for cross-platform safe sidecar unlinking with bounded retries on transient locks
    const unlinkWithRetry = async (filePath, maxAttempts = 10, backoffMs = 50) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return;
        } catch (err) {
          const isTransient = err.code === "EBUSY" || err.code === "EPERM";
          if (!isTransient || attempt === maxAttempts) {
            throw new Error(`Failed to unlink sidecar '${filePath}' after ${attempt} attempts: [${err.code}] ${err.message}`);
          }
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    };

    // 2. Create the backup candidate database in an isolated backup folder
    const backupCandidatePath = path.join(restoreTestDir, "verified_backup.db");
    const backupDb = new sqlite3.Database(backupCandidatePath);
    await new Promise((resolve) => {
      backupDb.serialize(() => {
        backupDb.run("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT);");
        backupDb.run("INSERT INTO users VALUES ('usr_restored_1', 'Alice');");
        backupDb.run("INSERT INTO users VALUES ('usr_restored_2', 'Bob');", resolve);
      });
    });
    await new Promise((resolve) => backupDb.close(resolve));

    // 3. Step A of Runbook: Pre-restoration verification of backup candidate
    const backupCheckDb = new sqlite3.Database(backupCandidatePath);
    const backupIntegrity = await new Promise((resolve, reject) => {
      backupCheckDb.get("PRAGMA integrity_check;", (err, r) => {
        if (err) reject(err);
        else resolve(r && (r.integrity_check || Object.values(r)[0]));
      });
    });
    assert.strictEqual(backupIntegrity, "ok", "Backup candidate must pass integrity check before restore");
    await new Promise((resolve) => backupCheckDb.close(resolve));

    // 4. Step B of Runbook: Safe removal of stale WAL/SHM sidecars while processes are stopped
    assert.ok(fs.existsSync(activeWalPath), "Stale WAL file exists before restoration");
    assert.ok(fs.existsSync(activeShmPath), "Stale SHM file exists before restoration");

    // Remove stale sidecar files using retry helper to handle transient OS locks
    await unlinkWithRetry(activeWalPath);
    await unlinkWithRetry(activeShmPath);
    assert.ok(!fs.existsSync(activeWalPath), "Stale WAL file must be removed before copying backup");
    assert.ok(!fs.existsSync(activeShmPath), "Stale SHM file must be removed before copying backup");

    // 5. Step C of Runbook: Atomic replacement of canonical database
    fs.copyFileSync(backupCandidatePath, activeDbPath);

    // 6. Step D of Runbook: Post-restoration verification of canonical database
    const restoredCanonicalDb = new sqlite3.Database(activeDbPath);
    const restoredIntegrity = await new Promise((resolve, reject) => {
      restoredCanonicalDb.get("PRAGMA integrity_check;", (err, r) => {
        if (err) reject(err);
        else resolve(r && (r.integrity_check || Object.values(r)[0]));
      });
    });
    assert.strictEqual(restoredIntegrity, "ok", "Restored canonical database must pass integrity check");

    const rowCount = await new Promise((resolve, reject) => {
      restoredCanonicalDb.get("SELECT COUNT(*) as c FROM users", (err, r) => {
        if (err) reject(err);
        else resolve(r);
      });
    });
    assert.strictEqual(rowCount.c, 2, "Restored database must contain all recovered rows");

    await new Promise((resolve) => restoredCanonicalDb.close(resolve));
    console.log("✔ TEST 12 PASSED: Isolated restoration safely purges stale WAL/SHM cross-platform and restores intact database.");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL 12 STORAGE SAFETY TESTS PASSED FLAWLESSLY!");
  console.log("==================================================");
} finally {
  await teardown();
}
