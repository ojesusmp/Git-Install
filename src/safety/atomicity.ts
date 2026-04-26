import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Write `content` to `targetPath` atomically.
 *
 * Sequence:
 *   1. Create parent directories if needed.
 *   2. If target exists: rename it to `<target>.backup-{Date.now()}-{process.pid}`.
 *   3. Write content to `<target>.tmp`.
 *   4. Rename `.tmp` → target (atomic on same filesystem).
 *   5. Delete backup (if any).
 *
 * On any failure after step 2: restore original from backup, delete `.tmp`.
 */
export async function atomicWrite(targetPath: string, content: string | Buffer): Promise<void> {
  const dir = path.dirname(targetPath);
  const tmpPath = `${targetPath}.tmp`;
  const backupPath = `${targetPath}.backup-${Date.now()}-${process.pid}`;

  // Ensure parent directories exist
  await fs.mkdir(dir, { recursive: true });

  // Check whether target already exists
  let hadExisting = false;
  try {
    await fs.access(targetPath);
    hadExisting = true;
  } catch {
    // target does not exist — no backup needed
  }

  // Backup existing file
  if (hadExisting) {
    await fs.rename(targetPath, backupPath);
  }

  try {
    // Write to .tmp
    await fs.writeFile(tmpPath, content);

    // Atomic rename .tmp → target
    await fs.rename(tmpPath, targetPath);

    // Success — delete backup
    if (hadExisting) {
      try {
        await fs.unlink(backupPath);
      } catch {
        // best-effort backup cleanup — not fatal
      }
    }
  } catch (err) {
    // Rollback: restore original from backup, clean up .tmp
    if (hadExisting) {
      try {
        await fs.rename(backupPath, targetPath);
      } catch {
        // best-effort restore
      }
    }
    try {
      await fs.unlink(tmpPath);
    } catch {
      // best-effort .tmp cleanup
    }
    throw err;
  }
}

/**
 * Scan `dir` for orphaned `.tmp` and `.backup-{ts}-{pid}` files left by
 * an interrupted `atomicWrite`, and recover the directory to a clean state.
 *
 * Recovery rules:
 *   - `.tmp` files: delete unconditionally.
 *   - `.backup-{ts}-{pid}` files:
 *     - If the original target already exists → delete the backup.
 *     - If the original target is missing → rename backup to original name.
 */
export async function recoverFromInterrupt(dir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return; // dir doesn't exist — nothing to recover
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);

    // Remove orphaned .tmp files
    if (entry.endsWith('.tmp')) {
      try {
        await fs.unlink(fullPath);
      } catch {
        // best-effort
      }
      continue;
    }

    // Handle .backup-{ts}-{pid} files
    // Pattern: <originalName>.backup-<digits>-<digits>
    const backupMatch = entry.match(/^(.+)\.backup-\d+-\d+$/);
    if (backupMatch) {
      const originalName = backupMatch[1];
      const originalPath = path.join(dir, originalName);

      let originalExists = false;
      try {
        await fs.access(originalPath);
        originalExists = true;
      } catch {
        // original missing
      }

      if (originalExists) {
        // Original is intact — backup is a leftover from a completed write
        try {
          await fs.unlink(fullPath);
        } catch {
          // best-effort
        }
      } else {
        // Original is missing — restore from backup
        try {
          await fs.rename(fullPath, originalPath);
        } catch {
          // best-effort
        }
      }
    }
  }
}
