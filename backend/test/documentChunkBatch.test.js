/**
 * Regression Test Suite: DocumentChunk.createMany Multi-Row Insert & Batching
 *
 * Verifies that the optimized DocumentChunk.createMany implementation:
 * 1. Safely handles empty input.
 * 2. Correctly inserts and formats multi-row chunk records.
 * 3. Preserves exact input ordering and property casing.
 * 4. Successfully handles batches spanning multiple statement chunks (>50 rows).
 * 5. Commits and rolls back atomically inside withTransaction.
 */

import assert from "assert";
import { dbRun, dbGet, dbAll, withTransaction, initDb } from "../src/config/db.js";
import { DocumentChunk } from "../src/models/DocumentChunk.js";
import { Book } from "../src/models/Book.js";
import { User } from "../src/models/User.js";

async function runDocumentChunkBatchTests() {
  console.log("\n==================================================");
  console.log("🧪 DOCUMENT CHUNK BATCHING & MULTI-ROW INSERT TESTS");
  console.log("==================================================");

  await initDb();

  const testUserId = `usr_batch_test_${Date.now()}`;
  await User.create({
    id: testUserId,
    name: "Chunk Batch Tester",
    email: `batch.${Date.now()}@test.edu`,
    login_method: "email"
  });

  const testBookId = `book_batch_test_${Date.now()}`;
  await Book.create({
    id: testBookId,
    user_id: testUserId,
    file_url: "/uploads/test.pdf",
    title: "Batch Optimization Test Book",
    subject: "Computer Science",
    file_name: "test.pdf",
    file_size: 1000,
    extracted_text: "Sample text"
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Empty input returns empty array
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Empty input returns [] without querying database");
    const emptyResult = await DocumentChunk.createMany([]);
    assert.deepStrictEqual(emptyResult, []);
    const nullResult = await DocumentChunk.createMany(null);
    assert.deepStrictEqual(nullResult, []);
    console.log("✔ TEST 1 PASSED: Empty and null inputs handled safely.");

    // -------------------------------------------------------------------------
    // TEST 2: Multi-row insert of 15 chunks preserves ordering & formatting
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Multi-row insert of 15 chunks in single batch");
    const chunkInputs = Array.from({ length: 15 }, (_, i) => ({
      book_id: testBookId,
      chapter: `Chapter ${Math.floor(i / 5) + 1}`,
      section: `Section ${i + 1}`,
      page_start: i * 2 + 1,
      page_end: i * 2 + 2,
      chunk_index: i,
      text: `Text content for chunk ${i} with specific keywords.`
    }));

    const insertedChunks = await DocumentChunk.createMany(chunkInputs);
    assert.strictEqual(insertedChunks.length, 15, "Should return 15 formatted chunks");

    // Verify ordering and field formatting
    for (let i = 0; i < 15; i++) {
      const c = insertedChunks[i];
      assert.strictEqual(c.chunk_index, i, `Chunk index must match input order at ${i}`);
      assert.strictEqual(c.chunkIndex, i, "Normalized chunkIndex must match");
      assert.strictEqual(c.book_id, testBookId);
      assert.strictEqual(c.bookId, testBookId);
      assert.strictEqual(c.section, `Section ${i + 1}`);
      assert.ok(c.id && c.id.startsWith("chk_"), "ID must be prefixed with chk_");
      assert.ok(c.createdAt || c.created_at, "Created timestamp must be present");
    }

    // Verify database row count
    const dbCount = await dbGet(
      "SELECT COUNT(*) AS total FROM document_chunks WHERE book_id = ?",
      [testBookId]
    );
    assert.strictEqual(dbCount.total, 15, "Database must contain exactly 15 records");
    console.log("✔ TEST 2 PASSED: 15 chunks inserted and formatted with exact ordering.");

    // Clean up test 2 chunks
    await DocumentChunk.deleteByBookId(testBookId);

    // -------------------------------------------------------------------------
    // TEST 3: Large batch spanning multiple batches (>50 chunks)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Large multi-batch insert (65 chunks spanning 2 BATCH_SIZE chunks)");
    const largeBatch = Array.from({ length: 65 }, (_, i) => ({
      book_id: testBookId,
      chapter: "Chapter 1: Scalability",
      section: `Chunk Section ${i}`,
      page_start: 1,
      page_end: 1,
      chunk_index: i,
      text: `Scalability text chunk ${i}`
    }));

    const largeResult = await DocumentChunk.createMany(largeBatch);
    assert.strictEqual(largeResult.length, 65, "Must insert and return all 65 chunks");
    assert.strictEqual(largeResult[0].chunk_index, 0);
    assert.strictEqual(largeResult[64].chunk_index, 64);

    const largeDbCount = await dbGet(
      "SELECT COUNT(*) AS total FROM document_chunks WHERE book_id = ?",
      [testBookId]
    );
    assert.strictEqual(largeDbCount.total, 65, "Database must contain all 65 chunks");
    console.log("✔ TEST 3 PASSED: Multi-batch insert succeeded without variable limit errors.");

    // Clean up test 3 chunks
    await DocumentChunk.deleteByBookId(testBookId);

    // -------------------------------------------------------------------------
    // TEST 4: Atomic rollback within withTransaction
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Atomic rollback within withTransaction on failure");
    let rollbackErrorCaught = false;
    try {
      await withTransaction(async () => {
        await DocumentChunk.createMany(chunkInputs.slice(0, 5));
        const midCount = await dbGet(
          "SELECT COUNT(*) AS total FROM document_chunks WHERE book_id = ?",
          [testBookId]
        );
        assert.strictEqual(midCount.total, 5, "Chunks should exist inside transaction");
        throw new Error("Simulated transactional persistence failure");
      });
    } catch (txErr) {
      assert.strictEqual(txErr.message, "Simulated transactional persistence failure");
      rollbackErrorCaught = true;
    }

    assert.strictEqual(rollbackErrorCaught, true, "Transaction error must be rethrown");

    const postRollbackCount = await dbGet(
      "SELECT COUNT(*) AS total FROM document_chunks WHERE book_id = ?",
      [testBookId]
    );
    assert.strictEqual(postRollbackCount.total, 0, "All chunks must be rolled back cleanly");
    console.log("✔ TEST 4 PASSED: Multi-row insert rolled back atomically with 0 dangling records.");

    console.log("\n==================================================");
    console.log("🎉 ALL DOCUMENT CHUNK BATCHING TESTS PASSED!");
    console.log("==================================================\n");
  } finally {
    // Teardown test entities
    await DocumentChunk.deleteByBookId(testBookId);
    await dbRun("DELETE FROM books WHERE id = ?", [testBookId]);
    await dbRun("DELETE FROM users WHERE id = ?", [testUserId]);
  }
}

runDocumentChunkBatchTests().catch((err) => {
  console.error("❌ DocumentChunk batch test failed:", err);
  process.exit(1);
});
