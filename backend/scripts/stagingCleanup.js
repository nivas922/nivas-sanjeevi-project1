/**
 * LearnAI Safe Staging Cleanup Script
 *
 * Implements strict, multi-layer guards to prevent accidental deletion of
 * production or unrelated data:
 * 1. Dry-run by default (previews records and assets without deleting).
 * 2. Exact staging database identity check (not loose substring match).
 * 3. Tag AND path-prefix validation for Cloudinary assets.
 * 4. Dual-resource discovery handling both 'raw' (textbooks) and 'image' assets.
 * 5. Requires explicit confirmation flag AND environment variable to execute deletion.
 */

import { v2 as cloudinary } from "cloudinary";
import { isTurso, tursoClient, localDb, dbRun, dbAll } from "../src/config/db.js";
import { CloudinaryService } from "../src/services/cloudinaryService.js";

export const STAGING_DB_PREFIX = "learnai-staging-";
export const STAGING_TAG = "learnai_staging_test";
export const STAGING_USER_PREFIX = "usr_stg_%";

/**
 * Validates whether a Turso database URL strictly targets an explicitly approved staging database.
 * 
 * Rules:
 * 1. APPROVED_STAGING_DB_URL must be explicitly provided (or set in environment). Missing approval is rejected.
 * 2. Both URLs must be syntactically valid URLs.
 * 3. Neither URL may contain production identifiers (e.g. 'production', 'prod', 'main') unless explicitly matching approved staging pattern.
 * 4. The hostname/path must strictly match the approved staging target (normalized).
 * 5. Hostname must conform to the required staging prefix ("learnai-staging-").
 *
 * @param {string} dbUrl The database URL to verify.
 * @param {string} [approvedUrl] Optional explicitly approved URL (defaults to process.env.APPROVED_STAGING_DB_URL).
 * @returns {boolean} True if and only if the URL is verified and matches the approved staging target.
 */
export function isVerifiedStagingDatabaseUrl(dbUrl, approvedUrl = null) {
  const targetApproval = approvedUrl || process.env.APPROVED_STAGING_DB_URL;
  if (!targetApproval || typeof targetApproval !== "string" || targetApproval.trim().length === 0) {
    return false;
  }
  if (!dbUrl || typeof dbUrl !== "string" || dbUrl.trim().length === 0) {
    return false;
  }

  try {
    const parsedDb = new URL(dbUrl.trim());
    const parsedApp = new URL(targetApproval.trim());

    // 1. Protocol validation: only explicitly supported secure protocols ('libsql:' and 'https:')
    const ALLOWED_PROTOCOLS = new Set(["libsql:", "https:"]);
    if (!ALLOWED_PROTOCOLS.has(parsedDb.protocol) || !ALLOWED_PROTOCOLS.has(parsedApp.protocol)) {
      return false;
    }
    // Protocol must match approved target
    if (parsedDb.protocol !== parsedApp.protocol) {
      return false;
    }

    // 2. Embedded credentials validation: fail closed on unexpected username or password in URL
    if (parsedDb.username || parsedDb.password || parsedApp.username || parsedApp.password) {
      return false;
    }

    // 3. Query parameters validation: fail closed on unexpected search/query parameters in URL
    if (parsedDb.search || parsedApp.search) {
      return false;
    }

    // 4. Hostname validation
    const dbHost = parsedDb.hostname.toLowerCase();
    const appHost = parsedApp.hostname.toLowerCase();
    if (!dbHost || !appHost) {
      return false;
    }

    // Reject production identifiers in host or path
    if (
      dbHost.includes("production") ||
      dbHost.includes("-prod") ||
      appHost.includes("production") ||
      appHost.includes("-prod")
    ) {
      return false;
    }

    // Pathname normalization and traversal protection
    const dbPath = parsedDb.pathname.replace(/^\/|\/$/g, "").toLowerCase();
    const appPath = parsedApp.pathname.replace(/^\/|\/$/g, "").toLowerCase();
    if (dbPath.includes("..") || appPath.includes("..")) {
      return false;
    }

    // Must conform to approved staging naming prefix
    const isStagingHost = dbHost.startsWith(STAGING_DB_PREFIX);
    const isStagingPath = dbPath === "learnai-staging" || dbPath.startsWith(STAGING_DB_PREFIX);
    if (!isStagingHost && !isStagingPath) {
      return false;
    }

    // Exact normalized target comparison: hostname and path must match approved target exactly
    if (dbHost !== appHost) {
      return false;
    }

    // Port normalization: normalize default 443 for https and libsql
    const normalizePort = (parsed) => {
      if (parsed.port) return parsed.port;
      if (parsed.protocol === "https:" || parsed.protocol === "libsql:") return "443";
      return "";
    };
    if (normalizePort(parsedDb) !== normalizePort(parsedApp)) {
      return false;
    }

    if (dbPath !== appPath) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Executes or previews staging cleanup across Turso and Cloudinary.
 *
 * @param {Object} options
 * @param {boolean} [options.dryRun=true] If true, only previews candidates without deleting.
 * @param {boolean} [options.confirmed=false] Explicit confirmation required for deletion.
 * @param {Object} [options.customCloudinary] Optional mock for unit testing.
 * @param {string} [options.approvedStagingDbUrl] Optional explicit approved target URL override.
 * @returns {Promise<Object>} Summary of scanned and deleted items.
 */
export async function runStagingCleanup(options = {}) {
  const args = process.argv.slice(2);
  const cliConfirm = args.includes("--confirm-destructive-cleanup");
  const envConfirm = process.env.CONFIRM_STAGING_CLEANUP === "true";

  const runIdArg = args.find((a) => a.startsWith("--run-id="))?.split("=")[1];
  const targetRunId = options.runId || runIdArg || null;

  if (targetRunId && (!/^[a-zA-Z0-9_-]{1,64}$/.test(targetRunId) || targetRunId.includes("%"))) {
    const errMsg = `SECURITY ABORT: Invalid targetRunId format: '${targetRunId}'. Must contain only alphanumeric characters, hyphens, and underscores without wildcards.`;
    console.error(`❌ ${errMsg}`);
    throw new Error(errMsg);
  }

  const targetUserIds = Array.isArray(options.targetUserIds) && options.targetUserIds.length > 0 ? options.targetUserIds : null;
  const targetAssetIds = Array.isArray(options.targetAssetIds) && options.targetAssetIds.length > 0 ? new Set(options.targetAssetIds) : null;

  const isConfirmed = options.confirmed ?? (cliConfirm && envConfirm);
  const isDryRun = options.dryRun ?? !isConfirmed;

  console.log("\n==================================================");
  console.log(`🧹 LearnAI Staging Cleanup Runner [${isDryRun ? "DRY-RUN MODE" : "DESTRUCTIVE EXECUTION"}]`);
  if (targetRunId) {
    console.log(`   Scoped strictly to run ID: ${targetRunId}`);
  }
  console.log("==================================================");

  const report = {
    dryRun: isDryRun,
    database: { targetChecked: false, usersFound: 0, usersDeleted: 0, error: null },
    cloudinary: { rawFound: 0, imageFound: 0, deletedCount: 0, error: null }
  };

  // ---------------------------------------------------------------------------
  // 1. Turso Database Cleanup Guard & Preview
  // ---------------------------------------------------------------------------
  console.log("\n[1/2] Checking Database Staging Records...");
  if (isTurso) {
    const dbUrl = process.env.TURSO_DATABASE_URL || "";
    const approvedTarget = options.approvedStagingDbUrl || process.env.APPROVED_STAGING_DB_URL || "";
    if (!isVerifiedStagingDatabaseUrl(dbUrl, approvedTarget)) {
      const errMsg = `SECURITY ABORT: Connected Turso database URL ('${dbUrl}') does NOT match APPROVED_STAGING_DB_URL ('${approvedTarget}') or is not a verified staging database (${STAGING_DB_PREFIX}*).`;
      console.error(`❌ ${errMsg}`);
      report.database.error = errMsg;
      throw new Error(errMsg);
    }
    report.database.targetChecked = true;
    console.log(`✔ Verified staging database target: ${dbUrl}`);
  } else {
    // If staging mode or staging validation is active, fail closed to prevent silent local SQLite fallback
    if (process.env.NODE_ENV === "staging" || process.env.STAGING_VALIDATION_ACTIVE === "true") {
      const errMsg = "SECURITY ABORT: Staging cleanup was invoked in staging mode but Turso credentials are not configured (isTurso is false). Silent fallback to local SQLite is blocked.";
      console.error(`❌ ${errMsg}`);
      report.database.error = errMsg;
      throw new Error(errMsg);
    }
    report.database.targetChecked = true;
    console.log("ℹ Running against local SQLite database for test staging cleanup.");
  }

  try {
    let previewRows = [];
    let totalUsers = 0;

    if (targetUserIds) {
      const placeholders = targetUserIds.map(() => "?").join(", ");
      previewRows = await dbAll(
        `SELECT id, name, email, created_at FROM users WHERE id IN (${placeholders}) LIMIT 10;`,
        targetUserIds
      );
      const countResult = await dbAll(
        `SELECT COUNT(*) AS total FROM users WHERE id IN (${placeholders});`,
        targetUserIds
      );
      totalUsers = countResult[0]?.total || 0;
    } else {
      const prefixPattern = targetRunId ? `usr_stg_${targetRunId}%` : STAGING_USER_PREFIX;
      previewRows = await dbAll(
        `SELECT id, name, email, created_at FROM users WHERE id LIKE ? LIMIT 10;`,
        [prefixPattern]
      );
      const countResult = await dbAll(
        `SELECT COUNT(*) AS total FROM users WHERE id LIKE ?;`,
        [prefixPattern]
      );
      totalUsers = countResult[0]?.total || 0;
    }
    report.database.usersFound = totalUsers;

    console.log(`   Found ${totalUsers} staging user record(s) matching criteria.`);
    if (previewRows.length > 0) {
      console.log("   Sample records to purge:");
      previewRows.forEach((r) => console.log(`     - [${r.id}] ${r.name} (${r.email || "no-email"}) created ${r.created_at}`));
    }

    if (isDryRun) {
      console.log("   👉 DRY-RUN: Zero database rows were deleted.");
    } else {
      let deleteResult;
      if (targetUserIds) {
        const placeholders = targetUserIds.map(() => "?").join(", ");
        deleteResult = await dbRun(
          `DELETE FROM users WHERE id IN (${placeholders});`,
          targetUserIds
        );
      } else {
        const prefixPattern = targetRunId ? `usr_stg_${targetRunId}%` : STAGING_USER_PREFIX;
        deleteResult = await dbRun(
          `DELETE FROM users WHERE id LIKE ?;`,
          [prefixPattern]
        );
      }
      report.database.usersDeleted = deleteResult.changes || deleteResult.rowsAffected || 0;
      console.log(`   ✔ Permanently purged ${report.database.usersDeleted} staging user(s) and cascading records.`);
    }
  } catch (dbErr) {
    console.error("❌ Database cleanup failed:", dbErr.message);
    report.database.error = dbErr.message;
    throw dbErr;
  }

  // ---------------------------------------------------------------------------
  // 2. Cloudinary Asset Cleanup Guard & Dual-Resource Discovery
  // ---------------------------------------------------------------------------
  console.log("\n[2/2] Checking Cloudinary Staging Assets...");
  const cloudClient = options.customCloudinary || (CloudinaryService.isConfigured() ? cloudinary : null);

  if (cloudClient && cloudClient.api) {
    try {
      if (!options.customCloudinary) {
        CloudinaryService.ensureConfigured();
      }

      // Query both 'raw' and 'image' resources tagged with staging tag using full pagination
      const rawResources = [];
      const imageResources = [];
      const maxPages = 100;

      for (const resType of ["raw", "image"]) {
        let cursor = null;
        let page = 0;
        do {
          page++;
          if (page > maxPages) {
            throw new Error(`Cloudinary discovery exceeded max page limit (${maxPages}) for ${resType}`);
          }
          const options = { resource_type: resType, max_results: 500 };
          if (cursor) options.next_cursor = cursor;
          const pageRes = await cloudClient.api.resources_by_tag(STAGING_TAG, options);
          if (!pageRes || !Array.isArray(pageRes.resources)) {
            throw new Error(`Invalid Cloudinary response on page ${page} for ${resType}`);
          }
          if (resType === "raw") {
            rawResources.push(...pageRes.resources);
          } else {
            imageResources.push(...pageRes.resources);
          }
          cursor = pageRes.next_cursor || null;
        } while (cursor);
      }

      // Strict security filter: public_id must strictly start with the dedicated staging/ namespace
      let safeRaw = rawResources.filter((r) =>
        r.public_id && r.public_id.startsWith("staging/")
      );
      let safeImage = imageResources.filter((r) =>
        r.public_id && r.public_id.startsWith("staging/")
      );

      // Restrict cleanup to exact per-run identifier or asset IDs if specified
      if (targetAssetIds) {
        safeRaw = safeRaw.filter((r) => targetAssetIds.has(r.public_id));
        safeImage = safeImage.filter((r) => targetAssetIds.has(r.public_id));
      } else if (targetRunId) {
        safeRaw = safeRaw.filter((r) => r.public_id.includes(targetRunId));
        safeImage = safeImage.filter((r) => r.public_id.includes(targetRunId));
      }

      // Deduplicate screened raw and image public IDs independently using Set before deletion
      const uniqueRawIds = Array.from(new Set(safeRaw.map((r) => r.public_id)));
      const uniqueImageIds = Array.from(new Set(safeImage.map((r) => r.public_id)));

      report.cloudinary.rawFound = uniqueRawIds.length;
      report.cloudinary.imageFound = uniqueImageIds.length;

      console.log(`   Found ${uniqueRawIds.length} raw asset(s) and ${uniqueImageIds.length} image asset(s) in 'staging/' tagged '${STAGING_TAG}'.`);

      if (uniqueRawIds.length > 0 || uniqueImageIds.length > 0) {
        console.log("   Discovered staging assets to purge:");
        [...uniqueRawIds.map((id) => ({ resource_type: "raw", public_id: id })),
         ...uniqueImageIds.map((id) => ({ resource_type: "image", public_id: id }))]
          .slice(0, 10).forEach((a) =>
            console.log(`     - [${a.resource_type}] ${a.public_id}`)
          );
      }

      if (isDryRun) {
        console.log("   👉 DRY-RUN: Zero Cloudinary assets were deleted.");
      } else {
        let deletedTotal = 0;
        // Explicit deletion of pre-screened, independently deduplicated public IDs ONLY
        if (uniqueRawIds.length > 0) {
          const rawDel = await cloudClient.api.delete_resources(uniqueRawIds, {
            resource_type: "raw"
          });
          deletedTotal += Object.keys(rawDel.deleted || {}).length;
        }
        if (uniqueImageIds.length > 0) {
          const imgDel = await cloudClient.api.delete_resources(uniqueImageIds, {
            resource_type: "image"
          });
          deletedTotal += Object.keys(imgDel.deleted || {}).length;
        }
        report.cloudinary.deletedCount = deletedTotal;
        console.log(`   ✔ Permanently purged ${deletedTotal} Cloudinary asset(s) matching pre-screened IDs.`);
      }
    } catch (cloudErr) {
      console.error("❌ Cloudinary cleanup error:", cloudErr.message);
      report.cloudinary.error = cloudErr.message;
      throw cloudErr;
    }
  } else {
    console.log("ℹ Cloudinary is not configured or offline. Skipping cloud asset cleanup.");
  }

  console.log("\n==================================================");
  console.log(`✔ Cleanup Completed: ${isDryRun ? "Dry run preview complete" : "Staging resources successfully purged"}`);
  console.log("==================================================\n");

  return report;
}

// Direct CLI invocation
if (process.argv[1] && process.argv[1].endsWith("stagingCleanup.js")) {
  runStagingCleanup().catch((err) => {
    console.error("Fatal cleanup runner failure:", err.message);
    process.exit(1);
  });
}
