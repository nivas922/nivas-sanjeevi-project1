# LearnAI — Phase 2.3 Staging Validation Plan

## 1. Scope, Purpose & Core Boundaries

### 1.1 Purpose
This document specifies the validation plan for testing LearnAI's cloud storage adapters (Turso remote database and Cloudinary authenticated storage) against **isolated, dedicated staging resources**. 

> [!IMPORTANT]
> **PLANNING AND DOCUMENTATION ONLY.**
> This document does not execute tests, establish network connections, provision accounts, access credentials, or alter code. Planning this workflow does **not** constitute proof of live provider compatibility. Real verification can only occur when explicit user authorization is granted and tests execute against dedicated staging infrastructure.

### 1.2 Strict Authorization Boundaries
- **Zero Production Disruption**: Production configuration, Render web service settings (`render.yaml`), and live user data are strictly excluded.
- **Local Isolation**: The default local SQLite database (`backend/data/learnai.db`) and local upload directory (`backend/uploads/`) must remain intact and completely separated from staging runs.
- **Zero Cost / Zero Budget**: All validation must strictly operate within verified free-tier allowances without generating charges or requiring credit card provisioning.
- **Protected Components**: `frontend/src/components/Auth/GoogleLoginButton.jsx` is protected and will never be touched.
- **Fail-Closed Execution**: If any test fails, quota ceiling is approached, or unexpected behavior is detected, testing halts immediately without retrying destructive operations.

---

## 2. Resource Isolation & Staging Architecture

```
                                      [LearnAI Application]
                                                |
               +--------------------------------+--------------------------------+
               |                                                                 |
     [Local / Offline Mode]                                            [Staging Mode (Isolated)]
  (Default when cloud envs absent)                                   (Requires explicit STAGING flag)
               |                                                                 |
    +----------+----------+                                           +----------+----------+
    |                     |                                           |                     |
[SQLite File]       [Local Disk]                                [Turso Staging DB]    [Cloudinary Staging]
(data/learnai.db)    (uploads/)                                  (learnai-staging)      (Folder: staging/*)
    |                     |                                           |                     |
  *PRESERVED*           *PRESERVED*                              *EPHEMERAL DATA*      *EPHEMERAL ASSETS*
```

### 2.1 Turso Staging Database Isolation
- **Dedicated Staging Instance**: Must use a distinct database named `learnai-staging` (never a production or shared database).
- **Separate Credentials**: Uses a staging-only database URL and restricted authentication token.
- **Schema Lifecycle**: Staging executes clean schema initialization (`initDb()`) on empty staging tables.
- **Ephemeral Test Data**: Every inserted row is tagged with a unique test run prefix (`test_stage_<timestamp>_<uuid>`) and cleaned up immediately after testing.

### 2.2 Cloudinary Staging Asset Isolation
- **Dedicated Asset Folder**: All test uploads are placed in `staging/textbooks/<userId>/<resourceType>/`.
- **Dedicated Tagging**: Every staging asset is tagged with `learnai_staging_test` and `run_<timestamp>`.
- **Strict Public ID Isolation**: Public IDs follow `staging/textbooks/${userId}/${resourceType}/${fileHash}`.
- **Atomic Cleanup**: Assets are destroyed via `CloudinaryService.destroyAsset()` immediately upon test completion or error.

---

## 3. Environment Variable Inventory

To execute staging validation, the environment must supply the following variable names **only**. No real secret values are documented here or committed to source control.

| Variable Name | Required For | Format / Description | Staging Value Rule |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Global | `staging` or `test` | Must NOT be `production`. |
| `STAGING_VALIDATION_ACTIVE` | Safety Gate | `true` | Explicit fail-safe guard required to run staging tests. |
| `TURSO_DATABASE_URL` | Turso Adapter | `libsql://learnai-staging-<org>.turso.io` or `https://...` | Must point to a staging database. |
| `TURSO_AUTH_TOKEN` | Turso Adapter | JWT Bearer token | Staging token with write access. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | String | Cloudinary cloud account name. |
| `CLOUDINARY_API_KEY` | Cloudinary | Numeric string | Cloudinary API Key. |
| `CLOUDINARY_API_SECRET` | Cloudinary | Secret string | Cloudinary API Secret. |
| `CLOUDINARY_MAX_FILE_SIZE_MB`| Cloudinary | Number | Set to `10` (strict free-tier ceiling). |
| `MAX_FILE_SIZE_MB` | Local Fallback | Number | Set to `50` (preserves local parity). |

> [!CAUTION]
> Never place real credentials in `.env`, `render.yaml`, or any file tracked by Git. When authorized, supply credentials dynamically via runtime environment variables for the test process only.

---

## 4. Free-Tier Quota Limits & Stop Conditions

### 4.1 Verified Quota Allowances vs Unconfirmed Provider Behaviors
*Verification Date: 2026-10-28 (Checked against official documentation).*

| Resource / Parameter | Documented Free-Tier Limit | Status | Source / Verification Notes |
| :--- | :--- | :--- | :--- |
| **Turso Total Storage** | **5 GB** per account (shared) | **Verified** | Official Turso Pricing Docs: `https://turso.tech/pricing` (Early 2025 updated tier). |
| **Turso Monthly Reads** | **500 Million** row reads | **Verified** | Official Turso Pricing Docs: `https://turso.tech/pricing`. |
| **Turso Monthly Writes**| **10 Million** row writes | **Verified** | Official Turso Pricing Docs: `https://turso.tech/pricing`. |
| **Turso Max Databases** | **100 databases** per account | **Verified** | Official Turso Pricing Docs: `https://turso.tech/pricing`. |
| **Turso Hrana Timeout** | ~5 seconds interactive stream timeout | *Unverified in Staging* | Official Hrana / sqld documentation notes server transaction locks abort on ~5s stall; must measure p95 latency in live staging. |
| **Turso Max Concurrency**| 100 concurrent streams | *Unverified in Staging* | Starter plan connection ceiling from official docs; requires concurrency profiling. |
| **Cloudinary Monthly Credits**| **25 Shared Credits** (rolling 30-day window) | **Verified** | Official Cloudinary Pricing: `https://cloudinary.com/pricing` (1 credit = 1 GB storage OR 1 GB bandwidth OR 1,000 transformations). |
| **Cloudinary Raw File Limit** | **10 MB per file** | **Verified** | Official Cloudinary Free Plan Limits: `https://cloudinary.com/documentation/image_upload_api_reference`. Uploads exceeding 10 MB fail with HTTP 400. |
| **Cloudinary Image File Limit**| **10 MB per file** (max 25 MP) | **Verified** | Official Cloudinary Free Plan Limits. |
| **Cloudinary Transformations** | Max 25,000 per month (if all 25 credits consumed) | **Verified** | Official Cloudinary Pricing documentation. |
| **Cloudinary Signed URL TTL** | 300 seconds (default) | **Verified** | `backend/src/services/cloudinaryService.js` using `cloudinary.utils.private_download_url`. |
| **Cloudinary Download Rate Limit**| Exact API rate limit on signed downloads | *Unverified in Staging* | Not published as fixed number; depends on account tier and rolling burst allowances. |

### 4.2 Hard Staging Budget & Stop Conditions
Staging validation MUST immediately stop if any of the following boundaries are triggered:
1. **Total Cloudinary Test Storage**: Exceeds **50 MB** cumulative storage during the test run.
2. **Total Cloudinary Asset Count**: Exceeds **20 assets** created during testing.
3. **Total Turso Write Rows**: Exceeds **5,000 row writes** across the entire validation run.
4. **Consecutive Network Failures**: 3 consecutive HTTP 5xx or connection reset errors.
5. **Dangling Asset Detection**: If an uploaded asset cannot be tracked or destroyed, testing stops immediately to prevent orphaned storage leaks.

---

## 5. Mandatory Preflight Approval Checklist

Before any staging script is executed or any remote connection is initiated, every item in this checklist must be manually reviewed and checked off:

- [ ] **1. Explicit User Authorization**: Has the user given direct, written authorization to execute Phase 2.3 live staging tests?
- [ ] **2. Exact Staging-Target Approval**: Is `APPROVED_STAGING_DB_URL` explicitly set in the environment and confirmed to match `TURSO_DATABASE_URL` exactly (host prefix `learnai-staging-*`, matching port and database path)?
- [ ] **3. Credential Verification**: Are the provided credentials confirmed to belong to dedicated non-production staging accounts?
- [ ] **4. Working Tree Cleanliness**: Is the Git working tree clean of accidental staging (`git status` checked)?
- [ ] **5. Protected File Intact**: Has `frontend/src/components/Auth/GoogleLoginButton.jsx` been verified as untracked and untouched?
- [ ] **6. Staging-Only Cloudinary Namespace Lock**: Is the upload pipeline verified to scope staging assets strictly into `staging/textbooks/*`, leaving the production root `textbooks/*` namespace untouched?
- [ ] **7. Cleanup Dry-Run Verification**: Has `node scripts/stagingCleanup.js` been executed in dry-run mode against the staging target prior to testing to prove the environment is clean and that zero production assets match?
- [ ] **8. Staging Integration Test Runner Readiness**: Is `backend/test/stagingCloudIntegration.test.js` verified present and confirmed to be gated by `STAGING_VALIDATION_ACTIVE="true"`, safely exiting without cloud contact when inactive?
- [ ] **9. Local SQLite Database Guarded & Baseline Hash Verified**:
  - Baseline SHA-256 Hash of `backend/data/learnai.db`: Compute immediately prior to launching live staging tests using:
    - PowerShell: `(Get-FileHash -Algorithm SHA256 data/learnai.db).Hash`
    - Linux/macOS: `sha256sum data/learnai.db`
  - Post-Staging Verification Rule: The SHA-256 hash must be re-computed after live staging and verified identical to the pre-staging baseline, proving the local database remained 100% detached and untouched during cloud operations. Do not delete, overwrite, or modify `backend/data/learnai.db`.
- [ ] **10. Provider Documentation Confirmed**: Have the verified 2026 provider limits (5 GB Turso, 10 MB Cloudinary raw limit) and unverified latency risks been acknowledged?
- [ ] **11. Quota Stop Guard Active**: Is `STAGING_VALIDATION_ACTIVE=true` set, and are execution thresholds (<= 50MB, <= 20 assets, <= 5,000 writes) enforced in code?

---

## 6. Test Classification: Local vs Live Provider Access

| Test ID | Test Description | Required Environment | Rationale |
| :--- | :--- | :--- | :--- |
| **LOC-01** | Bounded file size parsing (`parseBoundedFileSizeMb`) | Local Only | Pure logic validation; zero I/O needed. |
| **LOC-02** | Lexical & canonical path traversal defense | Local Only | Local filesystem validation; avoids cloud calls. |
| **LOC-03** | Local SQLite WAL checkpoint & `.backup` | Local Only | Validates disaster recovery for local engine. |
| **LOC-04** | Turso test double interactive transaction | Local Only | Validates ALS context propagation offline. |
| **STG-01** | Turso remote connection & schema init | **Live Staging** | Requires remote LibSQL handshake over TLS. |
| **STG-02** | Turso interactive transaction commit | **Live Staging** | Requires Hrana write stream over remote proxy. |
| **STG-03** | Turso interactive transaction rollback | **Live Staging** | Verifies remote rollback discards rows across session. |
| **STG-04** | Turso nested SAVEPOINT & partial rollback | **Live Staging** | Verifies remote proxy handles SQL `SAVEPOINT` in stream. |
| **STG-05** | Turso stream timeout & connection loss | **Live Staging** | Verifies fail-closed behavior on network partition. |
| **STG-06** | Cloudinary authenticated buffer upload (PDF) | **Live Staging** | Verifies 10MB raw upload and metadata return. |
| **STG-07** | Cloudinary authenticated buffer upload (Image) | **Live Staging** | Verifies image resource type and format resolution. |
| **STG-08** | Cloudinary signed delivery & binary integrity | **Live Staging** | Verifies HMAC-SHA1 signature and binary SHA-256 match. |
| **STG-09** | Cloudinary asset destruction & cleanup | **Live Staging** | Verifies remote asset deletion leaves zero storage trace. |
| **STG-10** | End-to-end atomic upload with simulated DB abort | **Live Staging** | Verifies cloud asset destruction on DB failure. |

---

## 7. Ordered Staging Test Suites

### Suite 1: Turso Remote Interactive Transactions (`STG-01` to `STG-05`)

#### Test Case 1.1: Remote Connectivity & Schema Bootstrap (`STG-01`)
- **Objective**: Confirm LibSQL client establishes secure TLS connection and creates tables without SQLite pragmas failing.
- **Preconditions**: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` configured.
- **Steps**:
  1. Initialize client using `createClient({ url, authToken })`.
  2. Execute `initDb()` against staging database.
  3. Query `SELECT name FROM sqlite_master WHERE type='table';`.
- **Expected Results**:
  - Tables `users`, `books`, `summaries`, `quizzes`, `progress`, `activity_log`, `document_chunks` exist.
  - WAL/synchronous pragmas are skipped when `isTurso === true`.

#### Test Case 1.2: Root Interactive Transaction Commit (`STG-02`)
- **Objective**: Verify `tursoClient.transaction("write")` commits atomically.
- **Steps**:
  1. Call `withTransaction(async () => { await dbRun("INSERT INTO users ...", [...]); })`.
  2. Query `dbGet("SELECT id FROM users WHERE id = ?", [testId])`.
- **Expected Results**:
  - Row is permanently visible after commit.
  - Returns normalized `{ lastInsertRowid, rowsAffected: 1 }`.

#### Test Case 1.3: Root Interactive Transaction Rollback (`STG-03`)
- **Objective**: Verify uncaught exception triggers `tursoTx.rollback()` and discards writes.
- **Steps**:
  1. Run `withTransaction(async () => { await dbRun("INSERT INTO users ..."); throw new Error("Abort"); })`.
  2. Catch error.
  3. Query `dbGet` for the inserted test record.
- **Expected Results**:
  - `withTransaction` rethrows original "Abort" error.
  - Query returns `undefined` (zero phantom rows exist).

#### Test Case 1.4: Nested Savepoint & Partial Rollback (`STG-04`)
- **Objective**: Verify `SAVEPOINT`, `RELEASE SAVEPOINT`, and `ROLLBACK TO SAVEPOINT` behave correctly over Hrana HTTP stream.
- **Steps**:
  1. Outer `withTransaction`: insert outer record.
  2. Inner `withTransaction`: insert inner record, then throw error caught by outer function.
  3. Outer function commits.
  4. Inspect database state.
- **Expected Results**:
  - Outer record exists.
  - Inner record was rolled back cleanly.
  - Transaction context completes without stream corruption.

#### Test Case 1.5: Connection Timeout & Stream Abortion (`STG-05`)
- **Objective**: Verify that stalled transactions do not hang indefinitely and fail closed.
- **Steps**:
  1. Open a transaction and simulate an artificial stall exceeding configured timeout.
- **Expected Results**:
  - Client terminates stream with timeout error.
  - Subsequent queries outside the transaction execute normally.

---

### Suite 2: Cloudinary Authenticated Storage & Delivery (`STG-06` to `STG-09`)

#### Test Case 2.1: Authenticated Raw PDF Upload (`STG-06`)
- **Objective**: Verify binary PDF buffer upload under 10 MB limit with authenticated access mode.
- **Input**: Valid 50 KB sample PDF buffer with known content SHA-256.
- **Steps**:
  1. Call `CloudinaryService.uploadBuffer({ buffer, userId: "usr_stg_1", fileHash, mimeType: "application/pdf" })`.
- **Expected Results**:
  - Result contains `publicId` matching `staging/textbooks/usr_stg_1/raw/<hash>`.
  - `resourceType` equals `"raw"`.
  - Asset is marked `authenticated` (not publicly accessible via raw HTTP without signature).

#### Test Case 2.2: Authenticated Image Upload (`STG-07`)
- **Objective**: Verify image file upload encodes resource type correctly.
- **Input**: 10 KB sample PNG buffer.
- **Steps**:
  1. Call `CloudinaryService.uploadBuffer({ buffer, userId: "usr_stg_1", fileHash, mimeType: "image/png" })`.
- **Expected Results**:
  - Result contains `publicId` matching `staging/textbooks/usr_stg_1/image/<hash>`.
  - `resourceType` equals `"image"`.

#### Test Case 2.3: Signed URL Generation & Binary Delivery Integrity (`STG-08`)
- **Objective**: Verify that server-side signed URL delivers exact byte-for-byte stream matching original file.
- **Steps**:
  1. Call `CloudinaryService.generateSignedUrl(publicId, resourceType)`.
  2. Inspect URL structure: contains valid timestamp expiry and HMAC signature.
  3. Stream asset via `CloudinaryService.streamAuthenticatedAsset(publicId, resourceType, mockResponse)`.
  4. Compute SHA-256 of downloaded stream.
- **Expected Results**:
  - Downloaded byte hash matches original upload hash exactly (`assert.strictEqual(originalHash, downloadedHash)`).
  - No signature tokens or Cloudinary internal URLs leak to the end user.

#### Test Case 2.4: Asset Cleanup & Verified Deletion (`STG-09`)
- **Objective**: Confirm `CloudinaryService.destroyAsset()` completely deletes authenticated asset.
- **Steps**:
  1. Call `CloudinaryService.destroyAsset(publicId, resourceType)`.
  2. Attempt to stream asset via `streamAuthenticatedAsset`.
- **Expected Results**:
  - Stream call fails with HTTP 404.
  - Storage is reclaimed immediately on Cloudinary.

---

### Suite 3: End-to-End Persistence Atomicity (`STG-10`)

#### Test Case 3.1: Database Persistence Failure Cloud Cleanup (`STG-10`)
- **Objective**: Confirm that if Cloudinary upload succeeds but the subsequent Turso database insert fails, the cloud asset is automatically destroyed.
- **Steps**:
  1. Execute upload flow with mocked database constraint failure.
  2. Verify HTTP response is 500.
  3. Verify Turso has 0 records.
  4. Verify Cloudinary asset was deleted via `destroyAsset`.
- **Expected Results**:
  - Zero dangling database rows.
  - Zero orphaned Cloudinary assets.

---

## 8. Staging Cleanup Procedures

A dedicated, safe cleanup script has been implemented in [`backend/scripts/stagingCleanup.js`](file:///c:/Users/sanje/Downloads/nivas-sanjeevi-project1-main/nivas-sanjeevi-project1-main/backend/scripts/stagingCleanup.js) to guarantee that staging resources leave zero residual trace while strictly preventing accidental deletion of production data:

### 8.1 Safety Guards Enforced
1. **Dry-Run by Default**: Unless `--confirm-destructive-cleanup` is passed on the CLI and `CONFIRM_STAGING_CLEANUP="true"` is set in the environment, the script executes in preview mode only.
2. **Exact Database Target Check**: Rejects loose substring matches. The Turso host/path must strictly match the designated staging prefix (`learnai-staging-*`). Production or arbitrary database URLs are rejected fail-closed.
3. **Dual-Resource Cloudinary Discovery**: Discovers and deletes both `raw` (PDFs) and `image` assets tagged with `learnai_staging_test`.
4. **Path Prefix Cross-Verification**: Assets must match both the staging tag AND have public IDs starting with `staging/` or `textbooks/usr_stg_` before deletion.

### 8.2 Execution Commands
```bash
# Preview candidates without deleting (Dry-Run):
node scripts/stagingCleanup.js

# Execute confirmed destructive purge:
CONFIRM_STAGING_CLEANUP=true node scripts/stagingCleanup.js --confirm-destructive-cleanup
```

---

## 9. Rollback to Local SQLite & Local Filesystem

If any blocking defect or quota limitation occurs during staging, the application must immediately revert to the verified local-first stack.

### 9.1 Immediate Offline Rollback Steps
1. **Unset Cloud Environment Variables**:
   ```bash
   unset TURSO_DATABASE_URL
   unset TURSO_AUTH_TOKEN
   unset CLOUDINARY_CLOUD_NAME
   unset CLOUDINARY_API_KEY
   unset CLOUDINARY_API_SECRET
   ```
2. **Verify SQLite Database File**:
   Confirm `backend/data/learnai.db` exists, has valid permissions, and passes integrity checks:
   ```bash
   node -e "import('./src/config/storagePreflight.js').then(m => console.log(m.StoragePreflight.validate()));"
   ```
3. **Verify Local Upload Directory**:
   Confirm `backend/uploads/` is writable and contains existing local PDFs.
4. **Execute Full Local Verification**:
   ```bash
   node test/cloudinaryLocalFirst.test.js
   node test/freeStorageLocalParity.test.js
   node test/storageSafety.test.js
   npm test
   ```
5. **Expected Rollback State**:
   - `isTurso` evaluates to `false`.
   - `CloudinaryService.isConfigured()` evaluates to `false`.
   - All operations fallback safely to local SQLite transactions, WAL checkpoints, and local disk streaming.

---

## 10. Objective Pass/Fail Evaluation Criteria

| Evaluation Dimension | Pass Criteria | Fail Criteria |
| :--- | :--- | :--- |
| **Transaction Atomicity** | 100% of failed transactions leave 0 dangling rows in Turso. | Any orphaned row remains after error. |
| **Data Integrity** | Uploaded PDF byte hash matches delivered stream byte hash exactly. | Hash mismatch or corrupted bytes. |
| **Cleanup Completeness**| All created staging assets and database rows are purged after test. | Any asset remains un-deleted in Cloudinary. |
| **Fallback Stability** | When cloud envs are unset, all 76 local tests pass without errors. | Any regression in local SQLite or disk delivery. |
| **Protected File** | `GoogleLoginButton.jsx` remains untracked and unmodified. | Any modification or deletion of protected component. |
| **Budget Compliance** | Total test resource consumption strictly <= 50 MB and <= 20 assets. | Quota exceeded or unexpected billing alerts. |

---

## 11. Outstanding Uncertainties & Risk Log

| Risk ID | Component | Uncertainty Description | Verification Required Before Production |
| :--- | :--- | :--- | :--- |
| **UNC-01** | Turso | Remote proxy behavior on rapid nested `SAVEPOINT` calls over Hrana HTTP streams. | Must be validated against live Turso staging database. |
| **UNC-02** | Cloudinary | Rate limit on server-side `private_download_url` generation under peak student reading traffic. | Must be confirmed against Cloudinary SLA for free-tier accounts. |
| **UNC-03** | Cloudinary | Maximum simultaneous upload stream bandwidth on free-tier connections. | Verify upload concurrency bounds in staging. |
| **UNC-04** | Turso | Interaction between Turso transaction timeouts and Render HTTP request timeouts (30s). | Staging tests must measure latency percentiles (p95/p99). |

---

## 12. Conclusion & Authorization Gate

This staging validation plan defines an isolated, zero-risk, and cost-controlled testing methodology. 

**NEXT STEP**: The plan is complete and documented. **NO TESTS HAVE BEEN RUN AND NO CLOUD CONNECTIONS HAVE BEEN INITIATED.** Execution requires separate, explicit authorization from the user.
