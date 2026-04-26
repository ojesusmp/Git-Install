import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all lib/safety modules before importing the command
vi.mock('../../src/safety/atomicity.js', () => ({
  recoverFromInterrupt: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/safety/protected-dirs.js', () => ({
  isProtected: vi.fn().mockReturnValue(false),
}));

vi.mock('../../src/lib/prompt.js', () => ({
  assertTTY: vi.fn(),
  confirmUninstall: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/lib/install-record.js', () => ({
  loadRecords: vi.fn(),
  removeRecord: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/lockfile.js', () => ({
  acquireLock: vi.fn().mockResolvedValue(undefined),
  releaseLock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    rm: vi.fn().mockResolvedValue(undefined),
  },
  rm: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

import type { InstallRecord, InstallStore } from '../../src/lib/install-record.js';

const RECORD_A: InstallRecord = {
  repo: 'ojesusmp/Git-Install',
  ref: 'main',
  resolvedSha: 'abc1234567890',
  installPath: '/home/user/installed-repos/Git-Install',
  timestamp: '2026-04-25T00:00:00.000Z',
};

const RECORD_B: InstallRecord = {
  repo: 'other-owner/Git-Install',
  ref: 'main',
  resolvedSha: 'def9876543210',
  installPath: '/home/user/installed-repos/Git-Install-2',
  timestamp: '2026-04-25T01:00:00.000Z',
};

function makeStore(records: InstallRecord[]): InstallStore {
  return { schemaVersion: 1, records };
}

describe('uninstall command', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Re-apply stable defaults after clearAllMocks
    const { recoverFromInterrupt } = await import('../../src/safety/atomicity.js');
    vi.mocked(recoverFromInterrupt).mockResolvedValue(undefined);

    const { isProtected } = await import('../../src/safety/protected-dirs.js');
    vi.mocked(isProtected).mockReturnValue(false);

    const { assertTTY, confirmUninstall } = await import('../../src/lib/prompt.js');
    vi.mocked(assertTTY).mockReturnValue(undefined);
    vi.mocked(confirmUninstall).mockResolvedValue(true);

    const { removeRecord } = await import('../../src/lib/install-record.js');
    vi.mocked(removeRecord).mockResolvedValue(undefined);

    const { acquireLock, releaseLock } = await import('../../src/lib/lockfile.js');
    vi.mocked(acquireLock).mockResolvedValue(undefined);
    vi.mocked(releaseLock).mockResolvedValue(undefined);

    const fsPromises = await import('node:fs/promises');
    vi.mocked(fsPromises.rm).mockResolvedValue(undefined);
  });

  // (a) No matching record
  it('(a) throws not-found when loadRecords returns empty', async () => {
    const { loadRecords } = await import('../../src/lib/install-record.js');
    vi.mocked(loadRecords).mockResolvedValue(makeStore([]));

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await expect(uninstall('Git-Install')).rejects.toThrow(/No installed repository found/);
  });

  // (b) Single match by full name
  it('(b) succeeds when matching by full owner/repo name', async () => {
    const { loadRecords } = await import('../../src/lib/install-record.js');
    vi.mocked(loadRecords).mockResolvedValue(makeStore([RECORD_A]));

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await expect(uninstall('ojesusmp/Git-Install')).resolves.toBeUndefined();

    const { removeRecord } = await import('../../src/lib/install-record.js');
    expect(vi.mocked(removeRecord)).toHaveBeenCalledWith('ojesusmp/Git-Install');
  });

  // (c) Single match by short name
  it('(c) succeeds when matching by short repo name', async () => {
    const { loadRecords } = await import('../../src/lib/install-record.js');
    vi.mocked(loadRecords).mockResolvedValue(makeStore([RECORD_A]));

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await expect(uninstall('Git-Install')).resolves.toBeUndefined();

    const { removeRecord } = await import('../../src/lib/install-record.js');
    expect(vi.mocked(removeRecord)).toHaveBeenCalledWith('ojesusmp/Git-Install');
  });

  // (d) Multiple matches — presents list and requires selection
  it('(d) presents numbered list when multiple records share repoName', async () => {
    const { loadRecords } = await import('../../src/lib/install-record.js');
    vi.mocked(loadRecords).mockResolvedValue(makeStore([RECORD_A, RECORD_B]));

    const { input } = await import('@inquirer/prompts');
    vi.mocked(input).mockResolvedValue('1');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await uninstall('Git-Install');

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(out).toContain('1.');
    expect(out).toContain('2.');
    expect(out).toContain('ojesusmp/Git-Install');
    expect(out).toContain('other-owner/Git-Install');
    expect(vi.mocked(input)).toHaveBeenCalled();

    stdoutSpy.mockRestore();
  });

  // (e) Protected install path
  it('(e) throws safety error when installPath is protected', async () => {
    const protectedRecord: InstallRecord = {
      ...RECORD_A,
      installPath: `${process.env.HOME ?? '/root'}/.claude/something`,
    };

    const { loadRecords } = await import('../../src/lib/install-record.js');
    vi.mocked(loadRecords).mockResolvedValue(makeStore([protectedRecord]));

    const { isProtected } = await import('../../src/safety/protected-dirs.js');
    vi.mocked(isProtected).mockReturnValue(true);

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await expect(uninstall('ojesusmp/Git-Install')).rejects.toThrow(
      /Refusing to remove from protected/,
    );
  });

  // (f) TTY refusal
  it('(f) rejects when assertTTY throws', async () => {
    const { loadRecords } = await import('../../src/lib/install-record.js');
    vi.mocked(loadRecords).mockResolvedValue(makeStore([RECORD_A]));

    const { assertTTY } = await import('../../src/lib/prompt.js');
    vi.mocked(assertTTY).mockImplementation(() => {
      throw new Error('TTY required: this command must be run in an interactive terminal.');
    });

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await expect(uninstall('ojesusmp/Git-Install')).rejects.toThrow(/TTY required/);
  });

  // (g) Confirmation rejection — no files deleted, no record removed
  it('(g) throws cancellation, no fs.rm, no removeRecord when confirmUninstall returns false', async () => {
    const { loadRecords } = await import('../../src/lib/install-record.js');
    vi.mocked(loadRecords).mockResolvedValue(makeStore([RECORD_A]));

    const { confirmUninstall } = await import('../../src/lib/prompt.js');
    vi.mocked(confirmUninstall).mockResolvedValue(false);

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await expect(uninstall('ojesusmp/Git-Install')).rejects.toThrow(/cancelled/i);

    const fsPromises = await import('node:fs/promises');
    expect(vi.mocked(fsPromises.rm)).not.toHaveBeenCalled();

    const { removeRecord } = await import('../../src/lib/install-record.js');
    expect(vi.mocked(removeRecord)).not.toHaveBeenCalled();
  });

  // (h) Successful uninstall — fs.rm, removeRecord, releaseLock all called
  it('(h) on success: fs.rm, removeRecord, and releaseLock are all called', async () => {
    const { loadRecords } = await import('../../src/lib/install-record.js');
    vi.mocked(loadRecords).mockResolvedValue(makeStore([RECORD_A]));

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await uninstall('ojesusmp/Git-Install');

    const fsPromises = await import('node:fs/promises');
    expect(vi.mocked(fsPromises.rm)).toHaveBeenCalledWith(RECORD_A.installPath, {
      recursive: true,
      force: true,
    });

    const { removeRecord } = await import('../../src/lib/install-record.js');
    expect(vi.mocked(removeRecord)).toHaveBeenCalledWith('ojesusmp/Git-Install');

    const { releaseLock } = await import('../../src/lib/lockfile.js');
    expect(vi.mocked(releaseLock)).toHaveBeenCalled();
  });

  // (i) confirmUninstall called (exact-string contract delegated to prompt.ts tests)
  it('(i) confirmUninstall is called with the removal plan string', async () => {
    const { loadRecords } = await import('../../src/lib/install-record.js');
    vi.mocked(loadRecords).mockResolvedValue(makeStore([RECORD_A]));

    const { confirmUninstall } = await import('../../src/lib/prompt.js');

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await uninstall('ojesusmp/Git-Install');

    expect(vi.mocked(confirmUninstall)).toHaveBeenCalledOnce();
    const planArg: string = vi.mocked(confirmUninstall).mock.calls[0][0];
    expect(planArg).toContain('ojesusmp/Git-Install');
    expect(planArg).toContain(RECORD_A.installPath);
    expect(planArg).toContain(RECORD_A.resolvedSha);
  });

  // (j) Lockfile contention — acquireLock throws, no fs.rm
  it('(j) rejects and does not call fs.rm when acquireLock throws', async () => {
    const { acquireLock } = await import('../../src/lib/lockfile.js');
    vi.mocked(acquireLock).mockRejectedValue(
      new Error('Another git-install process is already running.'),
    );

    const { uninstall } = await import('../../src/commands/uninstall.ts');
    await expect(uninstall('ojesusmp/Git-Install')).rejects.toThrow(/Another git-install/);

    const fsPromises = await import('node:fs/promises');
    expect(vi.mocked(fsPromises.rm)).not.toHaveBeenCalled();
  });
});
