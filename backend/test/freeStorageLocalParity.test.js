import assert from "assert";
import crypto from "crypto";
import { dbRun, dbGet, dbAll, initDb, safeConvertRowId, withTransaction } from "../src/config/db.js";
import { StorageService } from "../src/services/storageService.js";
import { PdfExtractorService } from "../src/services/pdfExtractorService.js";
import { createValidPdf } from "./generatePdf.js";

async function runLocalParityTests() {
  console.log("=== STARTING PHASE 1 LOCAL PARITY & STORAGE SAFETY TESTS ===\n");
  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  PASSED: ${name}`);
    } catch (err) {
      console.error(`❌ FAILED: ${name}`);
      console.error(err);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    totalTests++;
    try {
      await fn();
      passedTests++;
      console.log(`  PASSED: ${name}`);
    } catch (err) {
      console.error(`❌ FAILED: ${name}`);
      console.error(err);
      throw err;
    }
  }

  // Ensure DB initialized
  await initDb();

  // SUITE 1: BigInt to Number Safe Conversion
  console.log("\n--- Suite 1: Safe RowID and BigInt Conversion ---");

  test("safeConvertRowId handles null and undefined", () => {
    assert.strictEqual(safeConvertRowId(null), null);
    assert.strictEqual(safeConvertRowId(undefined), null);
  });

  test("safeConvertRowId handles normal safe numbers", () => {
    assert.strictEqual(safeConvertRowId(0), 0);
    assert.strictEqual(safeConvertRowId(12345), 12345);
    assert.strictEqual(safeConvertRowId(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
    assert.strictEqual(safeConvertRowId(Number.MIN_SAFE_INTEGER), Number.MIN_SAFE_INTEGER);
  });

  test("safeConvertRowId converts safe BigInt to Number", () => {
    assert.strictEqual(safeConvertRowId(42n), 42);
    assert.strictEqual(safeConvertRowId(BigInt(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
    assert.strictEqual(safeConvertRowId(BigInt(Number.MIN_SAFE_INTEGER)), Number.MIN_SAFE_INTEGER);
  });

  test("safeConvertRowId rejects unsafe BigInt exceeding MAX_SAFE_INTEGER", () => {
    const unsafeBig = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
    assert.throws(
      () => safeConvertRowId(unsafeBig),
      /Unsafe BigInt conversion/,
      "Must throw RangeError on BigInt exceeding MAX_SAFE_INTEGER"
    );
  });

  test("safeConvertRowId rejects unsafe BigInt below MIN_SAFE_INTEGER", () => {
    const unsafeNegativeBig = BigInt(Number.MIN_SAFE_INTEGER) - 1n;
    assert.throws(
      () => safeConvertRowId(unsafeNegativeBig),
      /Unsafe BigInt conversion/,
      "Must throw RangeError on BigInt below MIN_SAFE_INTEGER"
    );
  });

  // SUITE 2: Database Result-Object Compatibility and Change Counts
  console.log("\n--- Suite 2: Database Result Object Compatibility & Change Counts ---");

  await asyncTest("dbRun provides lastInsertRowid, lastID, rowsAffected, and changes parity", async () => {
    const testEmail = `test_parity_${Date.now()}@example.com`;
    const res = await dbRun(
      "INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?)",
      [`usr_test_${Date.now()}`, "Test User", testEmail, "direct"]
    );

    assert.ok(res !== null && typeof res === "object", "dbRun must return an object");
    assert.strictEqual(res.changes, 1, "res.changes must be 1");
    assert.strictEqual(res.rowsAffected, 1, "res.rowsAffected must equal res.changes");
    assert.ok(typeof res.lastID === "number" || res.lastID !== undefined, "res.lastID must exist");
    assert.strictEqual(res.lastInsertRowid, res.lastID, "lastInsertRowid must match lastID");
  });

  await asyncTest("dbGet returns clean plain object without driver pollution", async () => {
    const row = await dbGet("SELECT id, name, email FROM users WHERE id = 'usr_default'");
    assert.ok(row, "Must find usr_default");
    assert.strictEqual(row.id, "usr_default");
    assert.strictEqual(typeof row, "object");
    assert.strictEqual(Object.prototype.toString.call(row), "[object Object]");
  });

  await asyncTest("dbAll returns array of plain objects", async () => {
    const rows = await dbAll("SELECT id, name FROM users LIMIT 3");
    assert.ok(Array.isArray(rows), "dbAll must return an array");
    assert.ok(rows.length > 0, "rows must have elements");
    rows.forEach((r) => {
      assert.strictEqual(Object.prototype.toString.call(r), "[object Object]");
    });
  });

  await asyncTest("dbRun handles update change counts correctly", async () => {
    const uniqueName = `Updated_${Date.now()}`;
    const res = await dbRun("UPDATE users SET name = ? WHERE id = 'usr_default'", [uniqueName]);
    assert.strictEqual(res.changes, 1, "changes must be 1 on single row update");
    assert.strictEqual(res.rowsAffected, 1, "rowsAffected must match changes");

    // Restore name
    await dbRun("UPDATE users SET name = 'Student' WHERE id = 'usr_default'");
  });

  // SUITE 3: Transaction Behavior & Savepoint Nesting
  console.log("\n--- Suite 3: Transaction Behavior & Savepoint Nesting ---");

  await asyncTest("withTransaction commits successfully on completion", async () => {
    const txnUserId = `usr_txn_commit_${Date.now()}`;
    const txnEmail = `txn_commit_${Date.now()}@example.com`;

    await withTransaction(async () => {
      await dbRun(
        "INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?)",
        [txnUserId, "Txn User", txnEmail, "direct"]
      );
    });

    const found = await dbGet("SELECT id, email FROM users WHERE id = ?", [txnUserId]);
    assert.ok(found, "User inserted within committed transaction must exist");
    assert.strictEqual(found.email, txnEmail);

    // Clean up
    await dbRun("DELETE FROM users WHERE id = ?", [txnUserId]);
  });

  await asyncTest("withTransaction rolls back cleanly on exception", async () => {
    const txnFailUserId = `usr_txn_fail_${Date.now()}`;
    const txnFailEmail = `txn_fail_${Date.now()}@example.com`;

    let caughtErr = null;
    try {
      await withTransaction(async () => {
        await dbRun(
          "INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?)",
          [txnFailUserId, "Fail User", txnFailEmail, "direct"]
        );
        throw new Error("Simulated failure inside transaction");
      });
    } catch (err) {
      caughtErr = err;
    }

    assert.ok(caughtErr !== null, "withTransaction must rethrow the internal error");
    assert.strictEqual(caughtErr.message, "Simulated failure inside transaction");

    // Verify row was rolled back and does NOT exist
    const found = await dbGet("SELECT id FROM users WHERE id = ?", [txnFailUserId]);
    assert.strictEqual(found, undefined, "Rolled-back row must NOT exist in database");
  });

  await asyncTest("nested withTransaction commits both outer and inner on success", async () => {
    const outerId = `usr_nest_out_${Date.now()}`;
    const innerId = `usr_nest_in_${Date.now()}`;

    await withTransaction(async () => {
      await dbRun("INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?)", [
        outerId,
        "Outer User",
        `out_${Date.now()}@test.com`,
        "direct"
      ]);

      await withTransaction(async () => {
        await dbRun("INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?)", [
          innerId,
          "Inner User",
          `in_${Date.now()}@test.com`,
          "direct"
        ]);
      });
    });

    const outUser = await dbGet("SELECT id FROM users WHERE id = ?", [outerId]);
    const inUser = await dbGet("SELECT id FROM users WHERE id = ?", [innerId]);
    assert.ok(outUser, "Outer user must be committed");
    assert.ok(inUser, "Inner user must be committed");

    // Clean up
    await dbRun("DELETE FROM users WHERE id IN (?, ?)", [outerId, innerId]);
  });

  await asyncTest("nested withTransaction rolls back inner savepoint without failing outer (if caught)", async () => {
    const outerId = `usr_nest_keep_${Date.now()}`;
    const innerId = `usr_nest_abort_${Date.now()}`;

    await withTransaction(async () => {
      await dbRun("INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?)", [
        outerId,
        "Outer Retained",
        `keep_${Date.now()}@test.com`,
        "direct"
      ]);

      try {
        await withTransaction(async () => {
          await dbRun("INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?)", [
            innerId,
            "Inner Aborted",
            `abort_${Date.now()}@test.com`,
            "direct"
          ]);
          throw new Error("Simulated inner savepoint failure");
        });
      } catch (innerErr) {
        assert.strictEqual(innerErr.message, "Simulated inner savepoint failure");
        // Outer transaction handles/swallows inner error and proceeds
      }
    });

    const outUser = await dbGet("SELECT id FROM users WHERE id = ?", [outerId]);
    const inUser = await dbGet("SELECT id FROM users WHERE id = ?", [innerId]);
    assert.ok(outUser, "Outer user must exist because outer committed");
    assert.strictEqual(inUser, undefined, "Inner user must be rolled back by SAVEPOINT");

    // Clean up
    await dbRun("DELETE FROM users WHERE id = ?", [outerId]);
  });

  await asyncTest("outer failure rolls back both outer and nested savepoint work", async () => {
    const outerId = `usr_nest_fail_out_${Date.now()}`;
    const innerId = `usr_nest_fail_in_${Date.now()}`;

    let caughtOuterErr = null;
    try {
      await withTransaction(async () => {
        await dbRun("INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?)", [
          outerId,
          "Outer Rollback",
          `fail_out_${Date.now()}@test.com`,
          "direct"
        ]);

        await withTransaction(async () => {
          await dbRun("INSERT INTO users (id, name, email, login_method) VALUES (?, ?, ?, ?)", [
            innerId,
            "Inner Success",
            `fail_in_${Date.now()}@test.com`,
            "direct"
          ]);
        });

        // Fail AFTER inner savepoint released
        throw new Error("Simulated outer failure after inner release");
      });
    } catch (err) {
      caughtOuterErr = err;
    }

    assert.ok(caughtOuterErr !== null);
    assert.strictEqual(caughtOuterErr.message, "Simulated outer failure after inner release");

    const outUser = await dbGet("SELECT id FROM users WHERE id = ?", [outerId]);
    const inUser = await dbGet("SELECT id FROM users WHERE id = ?", [innerId]);
    assert.strictEqual(outUser, undefined, "Outer user must be rolled back");
    assert.strictEqual(inUser, undefined, "Inner user must also be rolled back by root ROLLBACK");
  });

  // SUITE 4: Error Handling
  console.log("\n--- Suite 4: Database Error Handling ---");

  await asyncTest("dbRun rejects on invalid SQL syntax", async () => {
    await assert.rejects(
      async () => {
        await dbRun("SELECTTT FROM invalid_syntax_table;");
      },
      /syntax error/i,
      "dbRun must reject on SQL syntax error"
    );
  });

  await asyncTest("dbGet rejects on invalid SQL query", async () => {
    await assert.rejects(
      async () => {
        await dbGet("SELECT * FROM non_existent_table_xyz;");
      },
      /no such table/i,
      "dbGet must reject on non-existent table"
    );
  });

  // SUITE 5: File Hash & Scoped Duplicate Detection
  console.log("\n--- Suite 5: File Hash & Scoped Duplicate Detection ---");

  test("computeFileHash calculates SHA-256 strictly from file bytes alone", () => {
    const testBytes = Buffer.from("LearnAI Test Textbook Content 2026", "utf-8");
    const expectedHash = crypto.createHash("sha256").update(testBytes).digest("hex");

    const computed = StorageService.computeFileHash(testBytes);
    assert.strictEqual(computed, expectedHash, "Computed hash must match exact SHA-256");
    assert.strictEqual(computed.length, 64, "SHA-256 hex string must be 64 characters");
  });

  test("computeFileHash rejects empty or invalid buffers", () => {
    assert.throws(
      () => StorageService.computeFileHash(Buffer.alloc(0)),
      /Cannot compute hash of empty file bytes/
    );
    assert.throws(
      () => StorageService.computeFileHash(null),
      /Invalid input/
    );
    assert.throws(
      () => StorageService.computeFileHash("not-a-buffer"),
      /Invalid input/
    );
  });

  test("getUserScopedFileKey isolates duplicates by authenticated user ID", () => {
    const fileBytes = Buffer.from("Shared Academic Textbook Content", "utf-8");
    const hash = StorageService.computeFileHash(fileBytes);

    const userAKey = StorageService.getUserScopedFileKey("user_alice", hash);
    const userBKey = StorageService.getUserScopedFileKey("user_bob", hash);

    assert.strictEqual(userAKey, `user_alice:${hash}`);
    assert.strictEqual(userBKey, `user_bob:${hash}`);
    assert.notStrictEqual(
      userAKey,
      userBKey,
      "User A and User B must receive distinct scoped keys for the identical file"
    );
  });

  test("getUserScopedFileKey rejects empty or missing user IDs", () => {
    assert.throws(
      () => StorageService.getUserScopedFileKey("", "abc123hash"),
      /User ID is required/
    );
    assert.throws(
      () => StorageService.getUserScopedFileKey("user_1", ""),
      /File hash is required/
    );
  });

  // SUITE 6: PDF and Document Buffer Text Extraction
  console.log("\n--- Suite 6: PDF and Document Buffer Text Extraction ---");

  await asyncTest("extractDocumentTextFromBuffer extracts text from in-memory text buffer", async () => {
    const textBuffer = Buffer.from("Operating Systems\nChapter 1: Process Management\nA process is a program in execution.", "utf-8");
    const extracted = await StorageService.extractDocumentTextFromBuffer(textBuffer, "text/plain", "notes.txt");
    assert.ok(extracted.includes("Process Management"), "Must extract text from buffer");
  });

  await asyncTest("extractPages extracts text from genuine valid binary PDF buffer", async () => {
    const pdfLines = [
      "LearnAI Distributed Systems Textbook",
      "Chapter 1: RPC Fundamentals and Fault Tolerance",
      "Remote Procedure Calls enable transparent client-server communication."
    ];
    const realPdfBuffer = createValidPdf(pdfLines);
    assert.ok(Buffer.isBuffer(realPdfBuffer), "Fixture must produce valid Buffer");
    assert.ok(realPdfBuffer.toString("latin1").startsWith("%PDF-1.4"), "Must have real PDF header");

    const extraction = await PdfExtractorService.extractPages(realPdfBuffer);
    assert.ok(extraction, "Must return extraction result");
    assert.strictEqual(extraction.totalPages, 1, "Must have 1 page");
    assert.ok(extraction.fullText.includes("RPC Fundamentals"), "Extracted text must contain 'RPC Fundamentals'");
    assert.ok(extraction.fullText.includes("Distributed Systems"), "Extracted text must contain 'Distributed Systems'");
    assert.strictEqual(extraction.pages.length, 1);
    assert.strictEqual(extraction.pages[0].pageNumber, 1);
    assert.ok(extraction.pages[0].text.includes("Fault Tolerance"));
  });

  await asyncTest("StorageService.extractDocumentTextFromBuffer extracts text from genuine binary PDF buffer", async () => {
    const realPdfBuffer = createValidPdf([
      "Database Internals",
      "Chapter 2: Write-Ahead Logging and Crash Recovery"
    ]);

    const extractedText = await StorageService.extractDocumentTextFromBuffer(realPdfBuffer, "application/pdf", "db_internals.pdf");
    assert.ok(extractedText.includes("Write-Ahead Logging"), "Must extract 'Write-Ahead Logging' from binary PDF");
    assert.ok(extractedText.includes("Crash Recovery"), "Must extract 'Crash Recovery' from binary PDF");
  });

  await asyncTest("extractPages correctly handles buffer with non-zero byteOffset", async () => {
    const realPdfBuffer = createValidPdf([
      "Unpooled Buffer Offset Verification",
      "Chapter 3: Memory Segment Handling"
    ]);

    // Create a larger parent buffer with leading and trailing padding to force a non-zero byteOffset
    const leadingPadding = Buffer.from("LEAD_PADDING_NON_ZERO_OFFSET_0123456789", "utf-8");
    const trailingPadding = Buffer.from("TRAIL_PADDING_EXTRA_BYTES_9876543210", "utf-8");
    const combinedBuffer = Buffer.concat([leadingPadding, realPdfBuffer, trailingPadding]);

    // Subarray slices the buffer without copying, setting non-zero byteOffset
    const nonZeroOffsetBuffer = combinedBuffer.subarray(leadingPadding.length, leadingPadding.length + realPdfBuffer.length);

    assert.strictEqual(nonZeroOffsetBuffer.byteOffset, combinedBuffer.byteOffset + leadingPadding.length);
    assert.ok(nonZeroOffsetBuffer.byteOffset > 0, "Buffer byteOffset must be greater than 0");
    assert.strictEqual(nonZeroOffsetBuffer.length, realPdfBuffer.length);

    const extraction = await PdfExtractorService.extractPages(nonZeroOffsetBuffer);
    assert.ok(extraction.fullText.includes("Unpooled Buffer Offset Verification"), "Must handle non-zero byteOffset cleanly");
    assert.ok(extraction.fullText.includes("Memory Segment Handling"), "Must preserve content across offset unpooling");
  });

  test("extractPages rejects invalid input types", async () => {
    await assert.rejects(
      async () => {
        await PdfExtractorService.extractPages(12345);
      },
      /Invalid input/,
      "extractPages must reject invalid input type"
    );
  });

  await asyncTest("extractPages rejects empty Buffer", async () => {
    await assert.rejects(
      async () => {
        await PdfExtractorService.extractPages(Buffer.alloc(0));
      },
      /Empty PDF buffer provided/,
      "extractPages must reject empty buffer"
    );
  });

  console.log(`\n=== ALL ${passedTests}/${totalTests} LOCAL PARITY & STORAGE SAFETY TESTS PASSED ===\n`);
}

runLocalParityTests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
