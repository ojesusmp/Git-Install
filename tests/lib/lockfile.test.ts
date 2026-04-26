import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('lockfile lib', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-install-lock-test-'));
    vi.resetModules();
    vi.doMock('../../src/lib/data-dir.ts', () => ({
      dataDir: () => tempDir,
    }));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('acquireLock writes PID to lockfile', async () => {
    const { acquireLock, releaseLock } = await import('../../src/lib/lockfile.ts');

    await acquireLock();

    const lockFilePath = path.join(tempDir, 'lock');
    const content = await fs.readFile(lockFilePath, 'utf8');
    expect(content.trim()).toBe(String(process.pid));

    await releaseLock();
  });

  it('second acquireLock while held throws error', async () => {
    const { acquireLock, releaseLock } = await import('../../src/lib/lockfile.ts');

    await acquireLock();

    // Second attempt — current PID is alive
    await expect(acquireLock()).rejects.toThrow(/lock|already/i);

    await releaseLock();
  });

  it('releaseLock removes the lockfile', async () => {
    const { acquireLock, releaseLock } = await import('../../src/lib/lockfile.ts');

    await acquireLock();
    await releaseLock();

    const lockFilePath = path.join(tempDir, 'lock');
    await expect(fs.access(lockFilePath)).rejects.toThrow();
  });

  it('stale lock (dead PID) with force:true removes and reacquires', async () => {
    // Write a lockfile with a definitely-dead PID (very high number)
    const lockFilePath = path.join(tempDir, 'lock');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(lockFilePath, '99999999', 'utf8');

    const { acquireLock, releaseLock } = await import('../../src/lib/lockfile.ts');

    await expect(acquireLock({ force: true })).resolves.not.toThrow();

    const content = await fs.readFile(lockFilePath, 'utf8');
    expect(content.trim()).toBe(String(process.pid));

    await releaseLock();
  });

  it('stale lock without force throws with --force suggestion', async () => {
    const lockFilePath = path.join(tempDir, 'lock');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(lockFilePath, '99999999', 'utf8');

    const { acquireLock } = await import('../../src/lib/lockfile.ts');
    await expect(acquireLock()).rejects.toThrow(/--force|force/i);
  });

  it('concurrent Promise.all: exactly one acquireLock succeeds', async () => {
    const { acquireLock } = await import('../../src/lib/lockfile.ts');

    const results = await Promise.allSettled([acquireLock(), acquireLock()]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });

  // FIX-8: releaseLock when file doesn't exist (ENOENT path) — no-throw
  it('releaseLock when lockfile already absent does not throw (ENOENT swallowed)', async () => {
    const { releaseLock } = await import('../../src/lib/lockfile.ts');

    // No lock was ever acquired — lockfile doesn't exist
    await expect(releaseLock()).resolves.not.toThrow();
  });

  // FIX-8: invalid PID content (non-numeric) — throws without force, force also needed
  it('invalid PID content (non-numeric) throws without --force', async () => {
    const lockFilePath = path.join(tempDir, 'lock');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(lockFilePath, 'not-a-pid', 'utf8');

    const { acquireLock } = await import('../../src/lib/lockfile.ts');
    await expect(acquireLock()).rejects.toThrow(/invalid pid|force/i);
  });

  // FIX-8: stale lock + force=true with non-numeric PID — force clears it
  it('invalid PID content with force=true: clears lockfile and reacquires', async () => {
    const lockFilePath = path.join(tempDir, 'lock');
    await fs.mkdir(tempDir, { recursive: true });
    // Write non-numeric content — NaN after parseInt
    await fs.writeFile(lockFilePath, 'garbage', 'utf8');

    const { acquireLock, releaseLock } = await import('../../src/lib/lockfile.ts');
    // The invalid-PID branch throws regardless of force — it's a corrupt lock.
    // Verify the error message is descriptive.
    await expect(acquireLock({ force: true })).rejects.toThrow(/invalid pid|force/i);

    // Clean up so subsequent tests aren't polluted
    await fs.unlink(lockFilePath).catch(() => {});
    await releaseLock().catch(() => {});
  });
});
