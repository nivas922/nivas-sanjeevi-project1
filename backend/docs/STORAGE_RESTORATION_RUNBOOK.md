# LearnAI — SQLite & Uploads Disaster Recovery & Restoration Runbook

## 1. Scope & Objective
This runbook provides the verified, step-by-step restoration procedure for LearnAI when recovering the SQLite database (`learnai.db`) and uploaded textbook documents (`uploads/`) from a verified snapshot archive on persistent storage (`/var/data`).

---

## 2. Strict Prerequisites Before Restoration
1. **Total Application Shutdown:**
   - All application processes, background workers, and database connections to `/var/data/learnai.db` MUST be completely stopped before initiating file replacement.
   - Never replace or overwrite a database file while Node.js or any other process has it open.
2. **Maintenance Mode / Routing Isolation:**
   - If routing allows incoming traffic, ensure `MAINTENANCE_MODE=true` is set so external traffic receives `503 Service Unavailable` with `Retry-After: 300` and does not attempt writes.
3. **Pre-Restoration Backup Verification:**
   - Always verify the backup candidate BEFORE modifying production files. Never restore an unverified snapshot.

---

## 3. Step-by-Step Restoration Procedure

### Step 3.1: Verify Backup Archive & Database Integrity
Before stopping services or touching existing data, inspect the backup:

```bash
# Set snapshot variables
SNAPSHOT_TAR="/var/data/learnai_snapshot_YYYYMMDD_HHMMSS.tar.gz"
WORK_DIR="/tmp/learnai_restore_verify"

# 1. Test archive integrity
tar -tzvf "$SNAPSHOT_TAR" > /dev/null
if [ $? -ne 0 ]; then
  echo "❌ CRITICAL: Snapshot tar archive is corrupted!"
  exit 1
fi

# 2. Extract database to isolated temporary location for integrity verification
mkdir -p "$WORK_DIR"
tar -xzvf "$SNAPSHOT_TAR" -C "$WORK_DIR" learnai_backup.db

# 3. Verify SQLite integrity
INTEGRITY=$(sqlite3 "$WORK_DIR/learnai_backup.db" "PRAGMA integrity_check;")
if [ "$INTEGRITY" != "ok" ]; then
  echo "❌ CRITICAL: Backup SQLite database failed integrity check! Result: $INTEGRITY"
  exit 1
fi

# 4. Verify table row counts
ROW_COUNT=$(sqlite3 "$WORK_DIR/learnai_backup.db" "SELECT COUNT(*) FROM users;")
echo "✔ Backup verified healthy. Users table contains $ROW_COUNT records."
```

---

### Step 3.2: Complete Application Process Termination
Ensure the LearnAI backend process is completely stopped:
```bash
# If running via systemd / process manager:
# kill -SIGTERM <pid> or stop container
# Verify no open handles exist:
lsof /var/data/learnai.db 2>/dev/null || fuser /var/data/learnai.db 2>/dev/null
```
If any process is still holding the file open, wait for graceful shutdown or terminate it before proceeding.

---

### Step 3.3: Safe Handling of Stale WAL and SHM Sidecar Files
SQLite Write-Ahead Logging (WAL) maintains three files on disk:
- `learnai.db`: Primary database file
- `learnai.db-wal`: Write-Ahead Log journal
- `learnai.db-shm`: Shared-Memory index

#### ⚠️ CRITICAL SAFETY RULES FOR WAL / SHM FILES:
1. **NEVER delete sidecar files while any process is connected.** Deleting `learnai.db-wal` while the application is running destroys uncheckpointed transactions and will instantly corrupt the database.
2. **NEVER leave stale sidecar files when replacing the primary database.** When the application is completely stopped and a backup is restored, any existing `learnai.db-wal` and `learnai.db-shm` files contain log frames and transaction headers tied to the *previous* database. If a new `learnai.db` is placed alongside old WAL files, SQLite will attempt automatic crash recovery on initial connection, applying mismatched WAL frames to the restored database. This causes catastrophic database corruption (`SQLITE_CORRUPT: database disk image is malformed`).
3. **Safe Removal Procedure (Once Application is Stopped):**
```bash
# Archive existing state for auditability before removal
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p /var/data/pre_restore_backup_${TIMESTAMP}
cp -p /var/data/learnai.db* /var/data/pre_restore_backup_${TIMESTAMP}/ 2>/dev/null || true

# Explicitly remove stale sidecar files
rm -f /var/data/learnai.db-wal /var/data/learnai.db-shm
```

---

### Step 3.4: Atomic Database Replacement
Copy the verified backup database into the canonical path:
```bash
cp "$WORK_DIR/learnai_backup.db" /var/data/learnai.db
chmod 600 /var/data/learnai.db
```

---

### Step 3.5: Restore Uploaded Textbook Files
Extract the uploads archive into the canonical uploads folder:
```bash
tar -xzvf "$SNAPSHOT_TAR" -C /var/data/ uploads/
chmod -R 700 /var/data/uploads/
```

---

### Step 3.6: Post-Restoration Verification
Confirm that the restored canonical database is valid and readable:
```bash
# 1. Run final integrity check on canonical path
CANONICAL_CHECK=$(sqlite3 /var/data/learnai.db "PRAGMA integrity_check;")
if [ "$CANONICAL_CHECK" != "ok" ]; then
  echo "❌ CRITICAL: Restored canonical database failed integrity check: $CANONICAL_CHECK"
  exit 1
fi
echo "✔ Restored canonical database verified: PRAGMA integrity_check = ok"

# 2. Clean up temporary extraction folder
rm -rf "$WORK_DIR"
```

---

### Step 3.7: Service Restart & Readiness Validation
1. Start the application service (`npm start` or container restart).
2. The preflight check (`npm run preflight`) executes and verifies `/var/data` mount and writability.
3. Test readiness probe:
   ```bash
   curl -s http://localhost:5000/ready
   # Expected output: {"ready":true,"status":"ready",...}
   ```
4. If testing during maintenance, disable maintenance mode (`MAINTENANCE_MODE=false`) once verified.
5. Test liveness probe:
   ```bash
   curl -s http://localhost:5000/health
   # Expected output: {"status":"healthy","mode":"normal",...}
   ```
