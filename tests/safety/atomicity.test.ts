import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as realFs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// ─── Mock fs/promises so rename can be intercepted per-test ──────────────────
// We forward everything to real fs by default; individual tests override rename.
let renameFailOnce = false;

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...real,
    rename: async (...args: Parameters<typeof real.rename>) => {
      if (renameFailOnce) {
        renameFailOnce = false;
        throw new Error('simulated rename failure');
      }
      return real.rename(...args);
    },
  };
});

import { atomicWrite, recoverFromInterrupt } from '../../src/safety/atomicity.js';

// Create a unique temp directory for each test
let tmpDir: string;

beforeEach(async () => {
  renameFailOnce = false;
  tmpDir = await realFs.mkdtemp(path.join(os.tmpdir(), 'atomicity-test-'));
});

afterEach(async () => {
  renameFailOnce = false;
  await realFs.rm(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// (a) Successful write — no orphans remain
// ─────────────────────────────────────────────────────────────────────────────
describe('atomicWrite — successful write', () => {
  it('(a) creates target with correct content', async () => {
    const target = path.join(tmpDir, 'output.txt');
    await atomicWrite(target, 'hello world');

    const content = await realFs.readFile(target, 'utf8');
    expect(content).toBe('hello world');
  });

  it('(a) works with Buffer content', async () => {
    const target = path.join(tmpDir, 'binary.bin');
    const buf = Buffer.from([0x01, 0x02, 0x03]);
    await atomicWrite(target, buf);

    const data = await realFs.readFile(target);
    expect(data).toEqual(buf);
  });

  it('(a) no .tmp orphan remains after success', async () => {
    const target = path.join(tmpDir, 'output.txt');
    await atomicWrite(target, 'hello world');

    const entries = await realFs.readdir(tmpDir);
    const tmpFiles = entries.filter((e) => e.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });

  it('(a) no .backup-* orphan remains after success (new file, no pre-existing target)', async () => {
    const target = path.join(tmpDir, 'output.txt');
    await atomicWrite(target, 'hello world');

    const entries = await realFs.readdir(tmpDir);
    const backupFiles = entries.filter((e) => e.includes('.backup-'));
    expect(backupFiles).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (b) Existing target — backed up before write, backup removed after success
// ─────────────────────────────────────────────────────────────────────────────
describe('atomicWrite — existing target backup', () => {
  it('(b) overwrites existing target with new content', async () => {
    const target = path.join(tmpDir, 'existing.txt');
    await realFs.writeFile(target, 'original content');

    await atomicWrite(target, 'new content');

    const content = await realFs.readFile(target, 'utf8');
    expect(content).toBe('new content');
  });

  it('(b) backup is cleaned up after successful overwrite', async () => {
    const target = path.join(tmpDir, 'existing.txt');
    await realFs.writeFile(target, 'original content');

    await atomicWrite(target, 'new content');

    const entries = await realFs.readdir(tmpDir);
    const backupFiles = entries.filter((e) => e.includes('.backup-'));
    expect(backupFiles).toHaveLength(0);
  });

  it('(b) no .tmp orphan after successful overwrite', async () => {
    const target = path.join(tmpDir, 'existing.txt');
    await realFs.writeFile(target, 'original content');

    await atomicWrite(target, 'new content');

    const entries = await realFs.readdir(tmpDir);
    const tmpFiles = entries.filter((e) => e.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (c) Failure mid-write — original restored, no .tmp orphan
// ─────────────────────────────────────────────────────────────────────────────
describe('atomicWrite — failure mid-write rollback', () => {
  it('(c) original content is restored when rename fails', async () => {
    const target = path.join(tmpDir, 'guarded.txt');
    await realFs.writeFile(target, 'original content');

    // Signal the mock to fail on next rename call
    renameFailOnce = true;

    await expect(atomicWrite(target, 'new content')).rejects.toThrow('simulated rename failure');

    // Original must be restored
    const content = await realFs.readFile(target, 'utf8');
    expect(content).toBe('original content');
  });

  it('(c) no .tmp orphan after failed write', async () => {
    const target = path.join(tmpDir, 'guarded.txt');
    await realFs.writeFile(target, 'original content');

    renameFailOnce = true;

    await expect(atomicWrite(target, 'new content')).rejects.toThrow();

    const entries = await realFs.readdir(tmpDir);
    const tmpFiles = entries.filter((e) => e.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (d) Nested directory creation
// ─────────────────────────────────────────────────────────────────────────────
describe('atomicWrite — nested directory creation', () => {
  it('(d) creates intermediate directories', async () => {
    const target = path.join(tmpDir, 'deep', 'nested', 'path', 'file.txt');
    await atomicWrite(target, 'nested content');

    const content = await realFs.readFile(target, 'utf8');
    expect(content).toBe('nested content');
  });

  it('(d) created directories and file are clean (no orphans)', async () => {
    const target = path.join(tmpDir, 'deep', 'nested', 'file.txt');
    await atomicWrite(target, 'nested content');

    const leafDir = path.join(tmpDir, 'deep', 'nested');
    const entries = await realFs.readdir(leafDir);
    const orphans = entries.filter((e) => e.endsWith('.tmp') || e.includes('.backup-'));
    expect(orphans).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (e) Orphan recovery — recoverFromInterrupt
// ─────────────────────────────────────────────────────────────────────────────
describe('recoverFromInterrupt — orphan recovery', () => {
  it('(e) removes orphaned .tmp files', async () => {
    const orphanTmp = path.join(tmpDir, 'target.txt.tmp');
    await realFs.writeFile(orphanTmp, 'orphaned tmp content');

    await recoverFromInterrupt(tmpDir);

    const entries = await realFs.readdir(tmpDir);
    const tmpFiles = entries.filter((e) => e.endsWith('.tmp'));
    expect(tmpFiles).toHaveLength(0);
  });

  it('(e) restores .backup-* to original name when target does not exist', async () => {
    const originalName = 'target.txt';
    const ts = Date.now();
    const pid = process.pid;
    const backupName = `${originalName}.backup-${ts}-${pid}`;
    const backupPath = path.join(tmpDir, backupName);
    await realFs.writeFile(backupPath, 'backup content');

    await recoverFromInterrupt(tmpDir);

    const restoredPath = path.join(tmpDir, originalName);
    const content = await realFs.readFile(restoredPath, 'utf8');
    expect(content).toBe('backup content');

    const entries = await realFs.readdir(tmpDir);
    const backupFiles = entries.filter((e) => e.includes('.backup-'));
    expect(backupFiles).toHaveLength(0);
  });

  it('(e) removes .backup-* when original target already exists', async () => {
    const originalName = 'target.txt';
    const ts = Date.now();
    const pid = process.pid;
    const backupName = `${originalName}.backup-${ts}-${pid}`;

    await realFs.writeFile(path.join(tmpDir, originalName), 'current content');
    await realFs.writeFile(path.join(tmpDir, backupName), 'old backup content');

    await recoverFromInterrupt(tmpDir);

    const content = await realFs.readFile(path.join(tmpDir, originalName), 'utf8');
    expect(content).toBe('current content');

    const entries = await realFs.readdir(tmpDir);
    const backupFiles = entries.filter((e) => e.includes('.backup-'));
    expect(backupFiles).toHaveLength(0);
  });

  it('(e) final state clean — no .tmp or .backup-* files remain', async () => {
    const ts = Date.now();
    const pid = process.pid;
    await realFs.writeFile(path.join(tmpDir, 'file1.txt.tmp'), 'tmp1');
    await realFs.writeFile(path.join(tmpDir, 'file2.txt.tmp'), 'tmp2');
    await realFs.writeFile(path.join(tmpDir, `file3.txt.backup-${ts}-${pid}`), 'backup content');

    await recoverFromInterrupt(tmpDir);

    const entries = await realFs.readdir(tmpDir);
    const orphans = entries.filter((e) => e.endsWith('.tmp') || e.includes('.backup-'));
    expect(orphans).toHaveLength(0);
  });

  it('(e) no-op when directory is clean', async () => {
    await realFs.writeFile(path.join(tmpDir, 'clean.txt'), 'clean content');

    await expect(recoverFromInterrupt(tmpDir)).resolves.not.toThrow();

    const entries = await realFs.readdir(tmpDir);
    expect(entries).toContain('clean.txt');
  });
});
