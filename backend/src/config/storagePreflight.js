import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./env.js";

/**
 * LearnAI Dedicated Storage Preflight Validation Module
 *
 * Prevents the application from booting or creating empty directories on the
 * ephemeral container filesystem when persistent storage is expected.
 */

export class StoragePreflight {
  /**
   * Recognized ephemeral and pseudo filesystem types that MUST be rejected for persistent storage.
   * tmpfs and ramfs live entirely in volatile RAM.
   * overlay and aufs represent ephemeral container layers or union mounts.
   */
  static KNOWN_EPHEMERAL_FS_TYPES = new Set([
    "tmpfs",
    "ramfs",
    "overlay",
    "overlayfs",
    "aufs",
    "shm",
    "devtmpfs",
    "rootfs",
    "squashfs",
    "iso9660",
    "proc",
    "sysfs",
    "cgroup",
    "cgroup2",
    "debugfs",
    "tracefs",
    "securityfs",
    "fusectl",
    "mqueue",
    "pstore",
    "bpf",
    "autofs",
    "binfmt_misc",
    "configfs",
    "hugetlbfs",
    "rpc_pipefs"
  ]);

  /**
   * Recognized standard persistent block filesystems on Linux.
   */
  static KNOWN_PERSISTENT_FS_TYPES = new Set([
    "ext4",
    "ext3",
    "ext2",
    "xfs",
    "btrfs",
    "f2fs",
    "zfs"
  ]);

  /**
   * Parse and inspect Linux mount evidence for a target mount point.
   * Reads from /proc/mounts (or provided content string for testing).
   */
  static inspectMountEvidence(mountPath, mountsContent = null) {
    if (mountsContent === null) {
      if (!fs.existsSync("/proc/mounts")) {
        return {
          ok: false,
          unreadable: true,
          reason: "Kernel mount table '/proc/mounts' does not exist (not Linux or restricted container)."
        };
      }
      try {
        mountsContent = fs.readFileSync("/proc/mounts", "utf8");
      } catch (err) {
        return {
          ok: false,
          unreadable: true,
          reason: `Failed to read '/proc/mounts': ${err.message}`
        };
      }
    }

    const resolvedTarget = path.resolve(mountPath);
    let realTarget = resolvedTarget;
    try {
      if (fs.existsSync(mountPath)) {
        realTarget = fs.realpathSync(mountPath);
      }
    } catch {}

    const lines = mountsContent.split("\n");
    let matchedEntry = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        const device = parts[0];
        // Handle octal escape sequences in mount points (e.g. \040 for space)
        const rawMountPoint = parts[1].replace(/\\([0-7]{3})/g, (_, oct) =>
          String.fromCharCode(parseInt(oct, 8))
        );
        const entryMountPoint = path.resolve(rawMountPoint);
        const fsType = parts[2].toLowerCase();
        const options = parts[3] ? parts[3].split(",") : [];

        // Exact match required for configured mount point
        if (entryMountPoint === realTarget || entryMountPoint === resolvedTarget) {
          matchedEntry = {
            device,
            mountPoint: entryMountPoint,
            fsType,
            options
          };
          // Continue scanning to capture the last active overlay if re-mounted
        }
      }
    }

    if (!matchedEntry) {
      return {
        ok: false,
        found: false,
        reason: `Mount point '${mountPath}' not found in kernel mount table.`
      };
    }

    return {
      ok: true,
      found: true,
      entry: matchedEntry
    };
  }

  /**
   * Evaluates whether mount evidence and device separation establish persistent storage.
   * Rejects ephemeral filesystems (tmpfs, overlay, ramfs, shm), mismatched mount points,
   * unreadable mount evidence, and shared container root devices.
   */
  static evaluateMountPersistence(mountPath, evidence, distinctDevice) {
    // 1. Device separation check: must not share root device
    if (distinctDevice !== true) {
      return {
        ok: false,
        reason: "Shares container root device ID (stat.dev). A dedicated block or persistent storage device is required."
      };
    }

    // 2. Mount table evidence check
    if (!evidence || evidence.unreadable) {
      return {
        ok: false,
        reason: (evidence && evidence.reason) || "Kernel mount table is unreadable or indeterminate. Runtime cloud verification is required."
      };
    }

    if (!evidence.found || !evidence.entry) {
      return {
        ok: false,
        reason: (evidence && evidence.reason) || `Mount point '${mountPath}' not found in kernel mount table.`
      };
    }

    const { device, fsType, mountPoint } = evidence.entry;

    // 3. Exact configured mount point check
    const resolvedTarget = path.resolve(mountPath);
    let realTarget = resolvedTarget;
    try {
      if (fs.existsSync(mountPath)) {
        realTarget = fs.realpathSync(mountPath);
      }
    } catch {}

    const resolvedEntryMount = path.resolve(mountPoint);
    if (resolvedEntryMount !== realTarget && resolvedEntryMount !== resolvedTarget) {
      return {
        ok: false,
        reason: `Mismatched mount point: expected '${mountPath}', found '${mountPoint}' in kernel mount table.`
      };
    }

    // 4. Reject known ephemeral filesystem types (tmpfs, overlay, ramfs, shm, devtmpfs, etc.)
    const normalizedFsType = (fsType || "").toLowerCase();
    if (this.KNOWN_EPHEMERAL_FS_TYPES.has(normalizedFsType)) {
      return {
        ok: false,
        reason: `Mount '${mountPath}' is mounted on ephemeral filesystem type '${fsType}' (source: '${device}'). Ephemeral mounts lose all data upon container restart.`
      };
    }

    // 5. Reject ephemeral pseudo device sources
    const normalizedDevice = (device || "").toLowerCase();
    if (["tmpfs", "overlay", "none", "shm", "ramfs"].includes(normalizedDevice)) {
      return {
        ok: false,
        reason: `Mount '${mountPath}' uses ephemeral device source '${device}'. Persistent storage requires a physical/virtual block or network storage device.`
      };
    }

    // 6. Verify filesystem type is a recognized persistent filesystem
    if (this.KNOWN_PERSISTENT_FS_TYPES.has(normalizedFsType)) {
      return {
        ok: true,
        details: {
          device,
          fsType: normalizedFsType,
          mountPoint: resolvedEntryMount
        }
      };
    }

    // 7. Unknown or unverified filesystem type: FAIL CLOSED
    // Do not assume or guess. If it cannot be reliably established as persistent, fail closed and require cloud verification.
    return {
      ok: false,
      reason: `Filesystem type '${fsType}' for mount '${mountPath}' cannot be reliably established as persistent storage. Failing closed; cloud verification on an authorized staging instance is required.`
    };
  }

  /**
   * Check if a path is recorded in Linux kernel mount tables (/proc/mounts)
   */
  static isLinuxMountPoint(mountPath) {
    const evidence = this.inspectMountEvidence(mountPath);
    return evidence.unreadable ? null : evidence.found;
  }

  /**
   * Check if directory resides on a separate device from container root (stat.dev)
   */
  static isDistinctDevice(mountPath) {
    try {
      if (!fs.existsSync(mountPath)) return false;
      const targetStat = fs.statSync(mountPath);
      const rootStat = fs.statSync(path.parse(mountPath).root || "/");
      return targetStat.dev !== rootStat.dev;
    } catch {
      return false;
    }
  }

  /**
   * Check directory writability by creating and deleting a temporary probe file
   */
  static isDirectoryWritable(dirPath) {
    if (!fs.existsSync(dirPath)) return false;
    const probePath = path.join(dirPath, `.preflight_probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    try {
      fs.writeFileSync(probePath, "preflight_ok", "utf8");
      fs.unlinkSync(probePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Robust containment check.
   * Returns true if childPath is strictly located inside parentPath.
   * Handles relative traversal (..), platform-specific separators, and symlink resolution.
   * Policy: childPath must reside beneath parentPath. childPath cannot be parentPath itself.
   */
  static isPathContained(parentPath, childPath) {
    if (!parentPath || !childPath) return false;

    // Resolve parent and child
    const resolvedParent = path.resolve(parentPath);
    let resolvedChild = path.resolve(childPath);

    // If symlink exists on child or its closest existing ancestor, resolve real path
    try {
      if (fs.existsSync(childPath)) {
        resolvedChild = fs.realpathSync(childPath);
      } else {
        const childDir = path.dirname(childPath);
        if (fs.existsSync(childDir)) {
          const realChildDir = fs.realpathSync(childDir);
          resolvedChild = path.join(realChildDir, path.basename(childPath));
        }
      }
    } catch {}

    let realParent = resolvedParent;
    try {
      if (fs.existsSync(parentPath)) {
        realParent = fs.realpathSync(parentPath);
      }
    } catch {}

    // Calculate relative path from parent to child
    const rel = path.relative(realParent, resolvedChild);

    // Child must not escape via directory traversal
    // Valid child filenames beginning with '..' (e.g. '..backup') are allowed;
    // only '..' alone or relative segments starting with '..' + separator represent traversal.
    const isEscaping =
      rel === ".." ||
      rel.startsWith(`..${path.sep}`) ||
      rel.startsWith("../") ||
      rel.startsWith("..\\");

    // If rel is empty ('') or '.', child IS parent itself (policy: child cannot be the mount root).
    // If isEscaping or path is absolute, child is outside parent.
    if (!rel || rel === "." || isEscaping || path.isAbsolute(rel)) {
      return false;
    }

    return true;
  }

  /**
   * Validates storage environment and enforces fail-closed behavior.
   * Does NOT blindly create directories when targeting persistent mounts.
   */
  static validate(options = {}) {
    const nodeEnv = options.nodeEnv || env.NODE_ENV || "development";
    const dbFile = options.dbFile || env.DB_FILE;
    const uploadDir = options.uploadDir || env.UPLOAD_DIR;
    const isProduction = nodeEnv === "production";
    const mountRoot = options.mountRoot || "/var/data";

    // In production, persistent storage is mandatory unless explicitly bypassed in testing options
    const requirePersistentDisk = options.requirePersistentDisk ?? (
      process.env.REQUIRE_PERSISTENT_DISK === "true" ||
      isProduction ||
      (dbFile && dbFile.includes(mountRoot)) ||
      (uploadDir && uploadDir.includes(mountRoot))
    );

    const targetsPersistentMount = (dbFile && dbFile.includes(mountRoot)) || (uploadDir && uploadDir.includes(mountRoot));

    // 1. Local development / test mode with standard local paths
    if (!requirePersistentDisk && !targetsPersistentMount) {
      const localDbDir = path.dirname(dbFile);
      if (!fs.existsSync(localDbDir)) {
        fs.mkdirSync(localDbDir, { recursive: true });
      }
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      return {
        ok: true,
        mode: "local",
        isPersistent: false,
        dbFile,
        uploadDir
      };
    }

    // 2. Production or explicit persistent disk requirement
    const errors = [];

    // Verify paths target the persistent mount in production (preventing silent fallback to ephemeral)
    if (isProduction || requirePersistentDisk) {
      if (!this.isPathContained(mountRoot, dbFile)) {
        errors.push(`Production DB_FILE ('${dbFile}') is not located within persistent mount '${mountRoot}'. Refusing silent fallback to ephemeral storage.`);
      }
      if (!this.isPathContained(mountRoot, uploadDir)) {
        errors.push(`Production UPLOAD_DIR ('${uploadDir}') is not located within persistent mount '${mountRoot}'. Refusing silent fallback to ephemeral storage.`);
      }
    }

    // Check A: Mount root existence
    if (!fs.existsSync(mountRoot)) {
      errors.push(`Mount root '${mountRoot}' does not exist on filesystem.`);
    } else {
      // Check B: Must be a real directory (not a symbolic link)
      if (fs.lstatSync(mountRoot).isSymbolicLink()) {
        errors.push(`Mount root '${mountRoot}' is a symbolic link. Persistent mount root must be a real directory mount point.`);
      }
      const stat = fs.statSync(mountRoot);
      if (!stat.isDirectory()) {
        errors.push(`Mount root '${mountRoot}' is not a directory.`);
      }

      // Check C: Writability
      if (!this.isDirectoryWritable(mountRoot)) {
        errors.push(`Mount root '${mountRoot}' is not writable by current process (UID ${process.getuid ? process.getuid() : "unknown"}).`);
      }

      // Check D: Persistent mount verification (Linux kernel mount table evidence and distinct device ID)
      let mountEvidence;
      if (options.mockMountEvidence !== undefined) {
        mountEvidence = options.mockMountEvidence;
      } else if (options.mockMountEntry !== undefined) {
        if (options.mockMountEntry === null) {
          mountEvidence = { ok: false, found: false, reason: `Mount point '${mountRoot}' not found in kernel mount table.` };
        } else if (options.mockMountEntry.unreadable) {
          mountEvidence = { ok: false, unreadable: true, reason: "Kernel mount table is unreadable or indeterminate." };
        } else {
          mountEvidence = { ok: true, found: true, entry: options.mockMountEntry };
        }
      } else if (options.mockMountsContent !== undefined) {
        mountEvidence = this.inspectMountEvidence(mountRoot, options.mockMountsContent);
      } else if (options.mockMountDetected !== undefined) {
        if (options.mockMountDetected === null) {
          mountEvidence = { ok: false, unreadable: true, reason: "Kernel mount table (/proc/mounts) is unreadable or indeterminate." };
        } else if (options.mockMountDetected === false) {
          mountEvidence = { ok: false, found: false, reason: `Mount point '${mountRoot}' not found in kernel mount table.` };
        } else {
          // If a boolean true was passed without entry, default to a canonical persistent block mount
          mountEvidence = {
            ok: true,
            found: true,
            entry: { device: "/dev/vdb", mountPoint: path.resolve(mountRoot), fsType: "ext4", options: ["rw"] }
          };
        }
      } else if (process.platform === "linux") {
        mountEvidence = this.inspectMountEvidence(mountRoot);
      } else {
        mountEvidence = null;
      }

      const distinctDevice = options.mockDistinctDevice !== undefined
        ? options.mockDistinctDevice
        : (process.platform === "linux" ? this.isDistinctDevice(mountRoot) : null);

      if (process.platform === "linux" || mountEvidence !== null || options.mockDistinctDevice !== undefined) {
        const evalResult = this.evaluateMountPersistence(mountRoot, mountEvidence, distinctDevice);
        if (!evalResult.ok) {
          errors.push(
            `Mount root '${mountRoot}' failed persistence verification: ${evalResult.reason}. Positive proof from kernel mount table (valid non-ephemeral filesystem) and distinct device separation is mandatory.`
          );
        }
      }
    }

    if (errors.length > 0) {
      return {
        ok: false,
        mode: "persistent",
        isPersistent: false,
        mountRoot,
        errors
      };
    }

    // Disk is verified as mounted and writable. Now safe to ensure canonical subdirectories exist.
    const persistentDbDir = path.dirname(dbFile);
    if (!fs.existsSync(persistentDbDir)) {
      fs.mkdirSync(persistentDbDir, { recursive: true });
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    return {
      ok: true,
      mode: "persistent",
      isPersistent: true,
      mountRoot,
      dbFile,
      uploadDir
    };
  }
}

/**
 * Top-level runner. Fails closed with process.exit(1) if validation fails.
 */
export function runStoragePreflight(options = {}) {
  const result = StoragePreflight.validate(options);

  if (!result.ok) {
    console.error("====================================================");
    console.error("❌ CRITICAL STORAGE PREFLIGHT FAILURE: FAILING CLOSED");
    console.error("====================================================");
    result.errors.forEach((err) => console.error(` - ${err}`));
    console.error("Refusing to boot on ephemeral container storage to prevent silent data loss.");
    console.error("Please verify that the Render Persistent Disk is attached and mounted at /var/data.");
    console.error("====================================================");

    if (options.exitOnFailure !== false) {
      process.exit(1);
    }
    throw new Error(`Storage preflight failed: ${result.errors.join("; ")}`);
  }

  if (result.isPersistent) {
    console.log(` [Storage Preflight] Verified persistent mount at ${result.mountRoot}`);
    console.log(` [Storage Preflight] Canonical DB path: ${result.dbFile}`);
    console.log(` [Storage Preflight] Canonical Uploads path: ${result.uploadDir}`);
  }

  return result;
}

// Support direct CLI invocation: `node src/config/storagePreflight.js`
const isDirectCli = () => {
  try {
    if (process.argv[1]) {
      return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
    }
  } catch {
    return false;
  }
  return false;
};

if (isDirectCli()) {
  try {
    runStoragePreflight({ exitOnFailure: true });
    console.log("✅ [Storage Preflight CLI] Storage preflight completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ [Storage Preflight CLI] Fatal:", err.message);
    process.exit(1);
  }
}
