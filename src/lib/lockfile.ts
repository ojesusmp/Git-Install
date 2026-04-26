import fs from 'fs/promises';
import { unlinkSync } from 'fs';
import path from 'path';
import { dataDir } from './data-dir.js';

function lockPath(): string {
  return path.join(dataDir(), 'lock');
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ESRCH') {
      return false;
    }
    // EPERM means process exists but we can't signal it — treat as alive
    return true;
  }
}

async function tryAtomicCreate(filePath: string): Promise<boolean> {
  try {
    // 'wx' flag = exclusive create — fails with EEXIST if file already exists
    const handle = await fs.open(filePath, 'wx');
    await handle.writeFile(String(process.pid), 'utf8');
    await handle.close();
    return true;
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'EEXIST') {
      return false;
    }
    throw err;
  }
}

function registerExitCleanup(filePath: string): void {
  process.on('exit', () => {
    try {
      unlinkSync(filePath);
    } catch {
      // Ignore errors during exit cleanup
    }
  });
}

export async function acquireLock(opts?: { force?: boolean }): Promise<void> {
  const filePath = lockPath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  // First attempt: atomic exclusive create
  const created = await tryAtomicCreate(filePath);
  if (created) {
    registerExitCleanup(filePath);
    return;
  }

  // Lock file already existed — read it and check liveness
  let existingPid = NaN;
  try {
    const existing = await fs.readFile(filePath, 'utf8');
    existingPid = parseInt(existing.trim(), 10);
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      // File vanished between our create attempt and read — retry once
      const retried = await tryAtomicCreate(filePath);
      if (retried) {
        registerExitCleanup(filePath);
        return;
      }
    }
    throw err;
  }

  if (!isNaN(existingPid)) {
    const alive = isPidAlive(existingPid);

    if (alive) {
      throw new Error(
        `Another git-install process (PID ${existingPid}) is already running. ` +
          `If this is stale, re-run with --force to remove it.`,
      );
    }

    // Stale lock — dead PID
    if (!opts?.force) {
      throw new Error(
        `Stale lockfile found (PID ${existingPid} is no longer running). ` +
          `Re-run with --force to remove the stale lock and continue.`,
      );
    }

    // force=true: remove stale lock and reacquire atomically
    await fs.unlink(filePath);
    const reacquired = await tryAtomicCreate(filePath);
    if (!reacquired) {
      throw new Error(
        `Failed to reacquire lock after removing stale lock — another process may have grabbed it.`,
      );
    }

    registerExitCleanup(filePath);
    return;
  }

  throw new Error(`Lockfile exists but contains invalid PID. Re-run with --force to clear it.`);
}

export async function releaseLock(): Promise<void> {
  const filePath = lockPath();
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }
}
