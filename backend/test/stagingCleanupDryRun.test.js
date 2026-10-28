/**
 * Regression Test Suite: Staging Cleanup Script Dry-Run & Safety Guards
 *
 * Verifies:
 * 1. isVerifiedStagingDatabaseUrl strictly requires APPROVED_STAGING_DB_URL and rejects mismatches, missing approval, and production targets.
 * 2. Dry-run mode previews matching records without deleting anything.
 * 3. Cloudinary cleanup discovers both raw and image assets, strictly enforces 'staging/' prefix, and deletes ONLY pre-screened IDs.
 * 4. Tagged assets outside the staging namespace (e.g. textbooks/*, avatars/*, production/*) are NEVER deleted.
 * 5. Confirmed cleanup strictly purges only staging-prefixed records (usr_stg_%) and preserves normal users.
 * 6. CloudinaryService scopes staging uploads strictly into 'staging/textbooks/'.
 */

import assert from "assert";
import { initDb, dbRun, dbGet, dbAll } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { CloudinaryService } from "../src/services/cloudinaryService.js";
import {
  isVerifiedStagingDatabaseUrl,
  runStagingCleanup,
  STAGING_TAG,
  STAGING_USER_PREFIX
} from "../scripts/stagingCleanup.js";

async function runStagingCleanupTests() {
  console.log("\n==================================================");
  console.log("🧪 STAGING CLEANUP SAFETY & DRY-RUN TESTS");
  console.log("==================================================");

  await initDb();

  // ---------------------------------------------------------------------------
  // TEST 1: Exact Turso Staging Database URL Verification & Approval Matching
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 1] Exact Turso Staging Database URL Verification & Approval Matching");
  const approvedUrl = "libsql://learnai-staging-test.turso.io";

  // Positive: Exact match of approved staging target
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("libsql://learnai-staging-test.turso.io", approvedUrl),
    true,
    "Exact approved staging URL match must succeed"
  );
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("https://learnai-staging-test.turso.io", "https://learnai-staging-test.turso.io"),
    true,
    "HTTPS staging target matching approval must succeed"
  );

  // Negative: Missing approval
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("libsql://learnai-staging-test.turso.io", null),
    false,
    "Missing approved URL must fail closed"
  );
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("libsql://learnai-staging-test.turso.io", ""),
    false,
    "Empty approved URL must fail closed"
  );

  // Negative: Mismatched target (different staging database)
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("libsql://learnai-staging-other.turso.io", approvedUrl),
    false,
    "Mismatched database URL must be rejected"
  );

  // Negative: Production targets (even if operator mistakenly approved them!)
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("https://learnai-production.turso.io", "https://learnai-production.turso.io"),
    false,
    "Production targets must be rejected even if approved"
  );
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("libsql://learnai-prod.turso.io", "libsql://learnai-prod.turso.io"),
    false,
    "-prod target must be rejected"
  );
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("https://my-arbitrary-db.turso.io", "https://my-arbitrary-db.turso.io"),
    false,
    "Non-staging prefix target must be rejected"
  );

  // Negative: Malformed URLs
  assert.strictEqual(isVerifiedStagingDatabaseUrl("not-a-valid-url", approvedUrl), false);
  assert.strictEqual(isVerifiedStagingDatabaseUrl(null, approvedUrl), false);

  // Negative: Unsupported protocols (e.g. unencrypted http, ws, ftp)
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("http://learnai-staging-test.turso.io", "http://learnai-staging-test.turso.io"),
    false,
    "Unencrypted HTTP must be rejected"
  );
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("ws://learnai-staging-test.turso.io", "ws://learnai-staging-test.turso.io"),
    false,
    "Websocket protocol must be rejected"
  );
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("ftp://learnai-staging-test.turso.io", "ftp://learnai-staging-test.turso.io"),
    false,
    "FTP protocol must be rejected"
  );

  // Negative: Protocol mismatch between DB URL and approved target
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("libsql://learnai-staging-test.turso.io", "https://learnai-staging-test.turso.io"),
    false,
    "Protocol mismatch must fail closed"
  );

  // Negative: Embedded credentials in URL
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("libsql://admin:secret@learnai-staging-test.turso.io", approvedUrl),
    false,
    "Embedded credentials in database URL must be rejected"
  );
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl(approvedUrl, "libsql://admin:secret@learnai-staging-test.turso.io"),
    false,
    "Embedded credentials in approved target must be rejected"
  );

  // Negative: Unexpected query parameters
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("libsql://learnai-staging-test.turso.io?drop=true", approvedUrl),
    false,
    "Query parameters in database URL must be rejected"
  );
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl(approvedUrl, "libsql://learnai-staging-test.turso.io?authToken=abc"),
    false,
    "Query parameters in approved URL must be rejected"
  );

  // Negative: Path traversal in pathname
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("libsql://learnai-staging-test.turso.io/../production", approvedUrl),
    false,
    "Path traversal sequences in URL must be rejected"
  );

  // Positive: Port normalization (default 443 normalized for HTTPS)
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("https://learnai-staging-test.turso.io:443", "https://learnai-staging-test.turso.io"),
    true,
    "Default port 443 should match implicit default port"
  );

  // Negative: Port mismatch
  assert.strictEqual(
    isVerifiedStagingDatabaseUrl("https://learnai-staging-test.turso.io:8080", "https://learnai-staging-test.turso.io"),
    false,
    "Mismatched port must fail closed"
  );

  console.log("✔ TEST 1 PASSED: Strict staging target approval and negative verification verified.");

  // ---------------------------------------------------------------------------
  // Setup Test Records in Database
  // ---------------------------------------------------------------------------
  const normalUserId = `usr_normal_${Date.now()}`;
  await User.create({
    id: normalUserId,
    name: "Production Like User",
    email: `normal.${Date.now()}@university.edu`,
    login_method: "email"
  });

  const stagingUserId1 = `usr_stg_${Date.now()}_1`;
  const stagingUserId2 = `usr_stg_${Date.now()}_2`;
  await User.create({
    id: stagingUserId1,
    name: "Staging Test User 1",
    email: `staging1.${Date.now()}@university.edu`,
    login_method: "email"
  });
  await User.create({
    id: stagingUserId2,
    name: "Staging Test User 2",
    email: `staging2.${Date.now()}@university.edu`,
    login_method: "email"
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 2: Dry-Run Mode Previews Without Deleting Anything
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Dry-Run Mode Preview (Zero Deletions)");
    const dryRunReport = await runStagingCleanup({ dryRun: true, confirmed: false });

    assert.strictEqual(dryRunReport.dryRun, true, "Report must indicate dry-run mode");
    assert.ok(dryRunReport.database.usersFound >= 2, "Must find at least 2 staging users");
    assert.strictEqual(dryRunReport.database.usersDeleted, 0, "Dry-run MUST NOT delete any users");

    // Verify all records still exist in database
    const user1StillExists = await User.findById(stagingUserId1);
    const user2StillExists = await User.findById(stagingUserId2);
    const normalStillExists = await User.findById(normalUserId);
    assert.ok(user1StillExists, "Staging user 1 must still exist after dry-run");
    assert.ok(user2StillExists, "Staging user 2 must still exist after dry-run");
    assert.ok(normalStillExists, "Normal user must still exist after dry-run");
    console.log("✔ TEST 2 PASSED: Dry-run previewed matching records with zero database deletions.");

    // -------------------------------------------------------------------------
    // TEST 3: Cloudinary Dual-Resource Discovery & Staging-Only Namespace Enforcement
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Cloudinary Staging-Only Namespace & Pre-Screened ID Deletion");
    const queriedResourceTypes = [];
    const deletedIdCalls = [];

    const mockCloudinary = {
      api: {
        resources_by_tag: async (tag, options) => {
          assert.strictEqual(tag, STAGING_TAG);
          queriedResourceTypes.push(options.resource_type);
          if (options.resource_type === "raw") {
            return {
              resources: [
                { public_id: "staging/textbooks/usr_stg_1/raw/abc", resource_type: "raw", bytes: 1024 },
                { public_id: "staging/textbooks/usr_stg_1/raw/abc", resource_type: "raw", bytes: 1024 }, // DUPLICATE raw ID (must be deduplicated!)
                { public_id: "production/textbooks/important_file", resource_type: "raw", bytes: 5000 }, // Must be excluded!
                { public_id: "textbooks/usr_stg_3/raw/legacy_format", resource_type: "raw", bytes: 2000 }  // Must be excluded!
              ]
            };
          }
          if (options.resource_type === "image") {
            return {
              resources: [
                { public_id: "staging/textbooks/usr_stg_2/image/def", resource_type: "image", bytes: 512 },
                { public_id: "staging/textbooks/usr_stg_2/image/def", resource_type: "image", bytes: 512 }, // DUPLICATE image ID (must be deduplicated!)
                { public_id: "avatars/real_user_avatar", resource_type: "image", bytes: 2048 } // Must be excluded!
              ]
            };
          }
          return { resources: [] };
        },
        delete_resources: async (ids, options) => {
          deletedIdCalls.push({ ids, resource_type: options.resource_type });
          const deletedMap = {};
          ids.forEach((id) => { deletedMap[id] = "deleted"; });
          return { deleted: deletedMap };
        }
      }
    };

    // Run confirmed cleanup with mock to verify explicit ID deletion, deduplication, and exclusions
    const cloudReport = await runStagingCleanup({
      dryRun: false,
      confirmed: true,
      customCloudinary: mockCloudinary
    });

    assert.ok(queriedResourceTypes.includes("raw"), "Must query raw assets");
    assert.ok(queriedResourceTypes.includes("image"), "Must query image assets");
    assert.strictEqual(cloudReport.cloudinary.rawFound, 1, "Only unique assets in 'staging/' must be counted");
    assert.strictEqual(cloudReport.cloudinary.imageFound, 1, "Only unique assets in 'staging/' must be counted");
    assert.strictEqual(cloudReport.cloudinary.deletedCount, 2, "Must delete exactly 2 deduplicated staging assets");

    // Verify EXACT deduplicated IDs passed to delete_resources:
    const rawDeleteCall = deletedIdCalls.find((c) => c.resource_type === "raw");
    const imageDeleteCall = deletedIdCalls.find((c) => c.resource_type === "image");

    assert.deepStrictEqual(rawDeleteCall.ids, ["staging/textbooks/usr_stg_1/raw/abc"], "Raw delete must contain deduplicated staging/ asset");
    assert.deepStrictEqual(imageDeleteCall.ids, ["staging/textbooks/usr_stg_2/image/def"], "Image delete must contain deduplicated staging/ asset");

    // Confirm production and non-staging assets were NEVER passed to delete_resources
    const allDeletedIds = deletedIdCalls.flatMap((c) => c.ids);
    assert.strictEqual(allDeletedIds.includes("production/textbooks/important_file"), false, "Production asset must never be deleted");
    assert.strictEqual(allDeletedIds.includes("textbooks/usr_stg_3/raw/legacy_format"), false, "Asset outside staging/ must never be deleted");
    assert.strictEqual(allDeletedIds.includes("avatars/real_user_avatar"), false, "Avatar asset must never be deleted");
    console.log("✔ TEST 3 PASSED: Tagged assets outside staging/ namespace are strictly protected, and duplicate IDs are deduplicated.");

    // -------------------------------------------------------------------------
    // TEST 4: CloudinaryService Staging Public ID Scoping & User ID Format Validation
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] CloudinaryService Staging Public ID Scoping & User ID Validation");
    // Valid existing user IDs:
    const validUserIds = [
      "usr_test",
      "usr_default",
      "usr_stg_1",
      "usr_student_alpha",
      "usr_d0353968-f97",
      "550e8400-e29b-41d4-a716-446655440000" // canonical UUID
    ];
    for (const validId of validUserIds) {
      assert.strictEqual(
        CloudinaryService.isValidUserId(validId),
        true,
        `User ID '${validId}' must be recognized as valid format`
      );
    }

    const prodId = CloudinaryService.getUserScopedPublicId("usr_test", "hash123", "raw", "production");
    assert.strictEqual(prodId, "textbooks/usr_test/raw/hash123", "Production/default namespace must use textbooks/");

    const stagingId = CloudinaryService.getUserScopedPublicId("usr_test", "hash123", "raw", "staging");
    assert.strictEqual(stagingId, "staging/textbooks/usr_test/raw/hash123", "Staging namespace must strictly start with staging/textbooks/");

    // Negative: Path traversal strings in userId
    const traversalUserIds = [
      "../usr_test",
      "../../admin",
      "usr_1/../usr_2",
      "..\\usr_test",
      "usr_1/subpath",
      "usr_1\\subpath",
      "usr_1:subpath",
      "usr_1|subpath",
      "usr 1",
      "usr_1%00",
      "admin",
      ""
    ];
    for (const invalidId of traversalUserIds) {
      assert.strictEqual(
        CloudinaryService.isValidUserId(invalidId),
        false,
        `Invalid/traversal user ID '${invalidId}' must be rejected by isValidUserId`
      );
      assert.throws(
        () => CloudinaryService.getUserScopedPublicId(invalidId, "hash123"),
        /Invalid user ID format|User ID is required/,
        `getUserScopedPublicId must throw on invalid user ID '${invalidId}'`
      );
    }
    console.log("✔ TEST 4 PASSED: Public ID generation validates user ID format, rejects path traversal/separators, and strictly scopes staging/.");

    // -------------------------------------------------------------------------
    // TEST 5: Confirmed Execution Purges Staging Records & Preserves Normal Records
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Confirmed Database Execution Purges Only Staging Records");
    // Verify staging users deleted in Test 3 run
    const user1Post = await User.findById(stagingUserId1);
    const user2Post = await User.findById(stagingUserId2);
    assert.strictEqual(user1Post, null, "Staging user 1 must be deleted");
    assert.strictEqual(user2Post, null, "Staging user 2 must be deleted");

    // Verify normal user strictly preserved!
    const normalPost = await User.findById(normalUserId);
    assert.ok(normalPost, "Normal non-staging user MUST be preserved");
    console.log("✔ TEST 5 PASSED: Staging database records purged cleanly while non-staging user preserved.");

    // -------------------------------------------------------------------------
    // TEST 6: Run-Scoped Cleanup & Target ID Isolation
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Run-Scoped Cleanup & Target ID Isolation");
    const specificRunToken = `run_${Date.now()}`;
    const runScopedUser = `usr_stg_${specificRunToken}_test`;
    const otherStagingUser = `usr_stg_other_${Date.now()}`;

    await User.create({ id: runScopedUser, name: "Scoped Run User", email: `scoped.${Date.now()}@staging.internal`, login_method: "direct" });
    await User.create({ id: otherStagingUser, name: "Other Run User", email: `other.${Date.now()}@staging.internal`, login_method: "direct" });

    // Cleanup strictly scoped to specificRunToken
    await runStagingCleanup({
      dryRun: false,
      confirmed: true,
      runId: specificRunToken
    });

    const scopedUserPost = await User.findById(runScopedUser);
    const otherUserPost = await User.findById(otherStagingUser);
    assert.strictEqual(scopedUserPost, null, "Target run-scoped user MUST be purged");
    assert.ok(otherUserPost, "Other staging user MUST be preserved when runId is specified");

    // Teardown other user
    await dbRun("DELETE FROM users WHERE id = ?", [otherStagingUser]);

    // Test fail-closed behavior when in staging mode without Turso configured
    process.env.NODE_ENV = "staging";
    await assert.rejects(
      async () => {
        await runStagingCleanup({ dryRun: true });
      },
      /SECURITY ABORT: Staging cleanup was invoked in staging mode but Turso credentials are not configured/,
      "Must fail closed in staging mode when isTurso is false"
    );
    delete process.env.NODE_ENV;
    console.log("✔ TEST 6 PASSED: Run-scoped cleanup isolates specific runs, and staging mode blocks silent local fallback.");

    console.log("\n==================================================");
    console.log("🎉 ALL STAGING CLEANUP SAFETY TESTS PASSED!");
    console.log("==================================================\n");
  } finally {
    // Teardown
    await dbRun("DELETE FROM users WHERE id IN (?, ?, ?)", [stagingUserId1, stagingUserId2, normalUserId]);
  }
}

runStagingCleanupTests().catch((err) => {
  console.error("❌ Staging cleanup test failed:", err);
  process.exit(1);
});
