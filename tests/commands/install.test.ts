import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any import of the module under test
// ---------------------------------------------------------------------------

vi.mock('../../src/safety/atomicity.ts', () => ({
  recoverFromInterrupt: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/lockfile.ts', () => ({
  acquireLock: vi.fn().mockResolvedValue(undefined),
  releaseLock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/lib/prompt.ts', () => ({
  assertTTY: vi.fn(),
  confirmInstall: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/safety/ref-resolver.ts', () => ({
  resolveRef: vi.fn().mockResolvedValue({ sha: 'abc1234567890abcdef', mutable: false }),
}));

vi.mock('../../src/safety/protected-dirs.ts', () => ({
  isProtected: vi.fn().mockReturnValue(false),
}));

vi.mock('../../src/lib/git.ts', () => ({
  cloneRepo: vi.fn().mockResolvedValue(undefined),
  revParseHead: vi.fn().mockResolvedValue('abc1234567890abcdef'),
}));

vi.mock('../../src/lib/install-record.ts', () => ({
  addRecord: vi.fn().mockResolvedValue(undefined),
  loadRecords: vi.fn().mockResolvedValue({ schemaVersion: 1, records: [] }),
}));

vi.mock('../../src/lib/github.ts', () => ({
  searchRepos: vi.fn().mockResolvedValue([]),
}));

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

// Mock node:fs/promises so we can control lstat per-test (FIX-3 symlink test)
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    realpath: vi.fn().mockImplementation(actual.realpath),
    lstat: vi.fn().mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' })),
  };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { install } from '../../src/commands/install.js';
import { recoverFromInterrupt } from '../../src/safety/atomicity.js';
import { acquireLock, releaseLock } from '../../src/lib/lockfile.js';
import { assertTTY, confirmInstall } from '../../src/lib/prompt.js';
import { resolveRef } from '../../src/safety/ref-resolver.js';
import { isProtected } from '../../src/safety/protected-dirs.js';
import { cloneRepo, revParseHead } from '../../src/lib/git.js';
import { addRecord } from '../../src/lib/install-record.js';
import { searchRepos } from '../../src/lib/github.ts';
import { select } from '@inquirer/prompts';
import { SafetyError, UserCancelError } from '../../src/lib/exit-codes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockResolveRef = vi.mocked(resolveRef);
const mockIsProtected = vi.mocked(isProtected);
const mockConfirmInstall = vi.mocked(confirmInstall);
const mockAssertTTY = vi.mocked(assertTTY);
const mockAcquireLock = vi.mocked(acquireLock);
const mockReleaseLock = vi.mocked(releaseLock);
const mockCloneRepo = vi.mocked(cloneRepo);
const mockRevParseHead = vi.mocked(revParseHead);
const mockAddRecord = vi.mocked(addRecord);
const mockSearchRepos = vi.mocked(searchRepos);
const mockRecoverFromInterrupt = vi.mocked(recoverFromInterrupt);
const mockSelect = vi.mocked(select);
const mockLstat = vi.mocked(fs.lstat);

const DEFAULT_SHA = 'abc1234567890abcdef';
const FAKE_CWD = '/fake/cwd';

function defaultMocks() {
  mockResolveRef.mockResolvedValue({ sha: DEFAULT_SHA, mutable: false });
  mockIsProtected.mockReturnValue(false);
  mockConfirmInstall.mockResolvedValue(true);
  mockAssertTTY.mockImplementation(() => {});
  mockAcquireLock.mockResolvedValue(undefined);
  mockReleaseLock.mockResolvedValue(undefined);
  mockCloneRepo.mockResolvedValue(undefined);
  mockRevParseHead.mockResolvedValue(DEFAULT_SHA);
  mockAddRecord.mockResolvedValue(undefined);
  mockRecoverFromInterrupt.mockResolvedValue(undefined);
  // lstat: default to ENOENT (path doesn't exist yet — no symlink)
  mockLstat.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('install command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultMocks();
  });

  afterEach(() => {
    delete process.env.GIT_INSTALL_NONINTERACTIVE;
  });

  // (a) TTY refusal
  it('(a) rejects when assertTTY throws', async () => {
    mockAssertTTY.mockImplementation(() => {
      throw new Error('TTY required: this command must be run in an interactive terminal.');
    });

    await expect(install('owner/repo', { cwd: FAKE_CWD })).rejects.toThrow(/TTY required/i);
    expect(mockCloneRepo).not.toHaveBeenCalled();
  });

  // (b) Protected-dir block — throws SafetyError (FIX-1)
  it('(b) rejects with SafetyError when target dir is protected', async () => {
    const protectedCwd = path.join(os.homedir(), '.claude');
    mockIsProtected.mockReturnValue(true);

    const err = await install('owner/repo', { cwd: protectedCwd }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SafetyError);
    expect((err as Error).message).toMatch(/Refusing to install into protected directory/i);
    expect(mockCloneRepo).not.toHaveBeenCalled();
  });

  // (c) Ref resolution warning shown in plan
  it('(c) includes mutable warning in the install plan passed to confirmInstall', async () => {
    mockResolveRef.mockResolvedValue({
      sha: DEFAULT_SHA,
      mutable: true,
      warning: 'mutable ref warning text',
    });

    await install('owner/repo', { cwd: FAKE_CWD });

    const planArg = mockConfirmInstall.mock.calls[0][0] as string;
    expect(planArg).toContain('mutable ref warning text');
    expect(planArg).toContain('yes');
  });

  // (d) Confirm rejection → UserCancelError (FIX-1)
  it('(d) rejects with UserCancelError when confirmInstall returns false', async () => {
    mockConfirmInstall.mockResolvedValue(false);

    const err = await install('owner/repo', { cwd: FAKE_CWD }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UserCancelError);
    expect((err as Error).message).toMatch(/cancelled/i);
    expect(mockCloneRepo).not.toHaveBeenCalled();
  });

  // (e) Successful install: cloneRepo, addRecord, releaseLock all called correctly
  it('(e) successful install calls cloneRepo, addRecord, releaseLock', async () => {
    await install('owner/repo', { cwd: FAKE_CWD });

    const expectedTarget = path.resolve(FAKE_CWD, 'installed-repos', 'repo');

    expect(mockCloneRepo).toHaveBeenCalledWith(
      'https://github.com/owner/repo.git',
      expectedTarget,
      DEFAULT_SHA,
    );
    expect(mockAddRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        repo: 'owner/repo',
        ref: 'HEAD',
        resolvedSha: DEFAULT_SHA,
        installPath: expectedTarget,
      }),
    );
    expect(mockReleaseLock).toHaveBeenCalled();
  });

  // (f) SHA verification failure
  it('(f) throws when revParseHead returns different SHA than resolved', async () => {
    mockRevParseHead.mockResolvedValue('deadbeef0000000000');

    await expect(install('owner/repo', { cwd: FAKE_CWD })).rejects.toThrow(
      /SHA verification failed/i,
    );
  });

  // (g) Lockfile contention → no clone attempted
  it('(g) rejects when acquireLock throws, does not clone', async () => {
    mockAcquireLock.mockRejectedValue(new Error('Another git-install process is already running.'));

    await expect(install('owner/repo', { cwd: FAKE_CWD })).rejects.toThrow(/already running/i);
    expect(mockCloneRepo).not.toHaveBeenCalled();
  });

  // (h) Recovery called BEFORE lock acquisition
  it('(h) recoverFromInterrupt is called before acquireLock', async () => {
    const callOrder: string[] = [];
    mockRecoverFromInterrupt.mockImplementation(async () => {
      callOrder.push('recover');
    });
    mockAcquireLock.mockImplementation(async () => {
      callOrder.push('lock');
    });

    await install('owner/repo', { cwd: FAKE_CWD });

    expect(callOrder[0]).toBe('recover');
    expect(callOrder[1]).toBe('lock');
  });

  // (i) Query parsing — all formats
  describe('(i) query parsing', () => {
    it('parses owner/repo', async () => {
      await install('myorg/myrepo', { cwd: FAKE_CWD });
      expect(mockResolveRef).toHaveBeenCalledWith('myorg/myrepo', undefined);
      const expectedTarget = path.resolve(FAKE_CWD, 'installed-repos', 'myrepo');
      expect(mockCloneRepo).toHaveBeenCalledWith(
        'https://github.com/myorg/myrepo.git',
        expectedTarget,
        DEFAULT_SHA,
      );
    });

    it('parses owner/repo@ref', async () => {
      await install('myorg/myrepo@v1.2', { cwd: FAKE_CWD });
      expect(mockResolveRef).toHaveBeenCalledWith('myorg/myrepo', 'v1.2');
    });

    it('parses full GitHub URL https://github.com/owner/repo', async () => {
      await install('https://github.com/myorg/myrepo', { cwd: FAKE_CWD });
      expect(mockResolveRef).toHaveBeenCalledWith('myorg/myrepo', undefined);
    });

    it('parses GitHub URL with /tree/branch', async () => {
      await install('https://github.com/myorg/myrepo/tree/main', { cwd: FAKE_CWD });
      expect(mockResolveRef).toHaveBeenCalledWith('myorg/myrepo', 'main');
    });

    it('falls back to searchRepos for unrecognised query, auto-selects single result', async () => {
      mockSearchRepos.mockResolvedValue([
        {
          owner: 'searchorg',
          name: 'searchrepo',
          fullName: 'searchorg/searchrepo',
          description: 'A repo',
          stars: 10,
          language: 'TypeScript',
          url: 'https://github.com/searchorg/searchrepo',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]);

      await install('some free text query', { cwd: FAKE_CWD });

      expect(mockSearchRepos).toHaveBeenCalledWith('some free text query');
      expect(mockResolveRef).toHaveBeenCalledWith('searchorg/searchrepo', undefined);
    });

    it('presents select prompt when search returns multiple results', async () => {
      mockSearchRepos.mockResolvedValue([
        {
          owner: 'org1',
          name: 'repo1',
          fullName: 'org1/repo1',
          description: null,
          stars: 5,
          language: null,
          url: 'https://github.com/org1/repo1',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          owner: 'org2',
          name: 'repo2',
          fullName: 'org2/repo2',
          description: null,
          stars: 3,
          language: null,
          url: 'https://github.com/org2/repo2',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]);
      mockSelect.mockResolvedValue('org2/repo2');

      await install('multi result query', { cwd: FAKE_CWD });

      expect(mockSelect).toHaveBeenCalled();
      expect(mockResolveRef).toHaveBeenCalledWith('org2/repo2', undefined);
    });
  });

  // (j) Adversarial fixture: README with dangerous content does not get executed
  it('(j) adversarial fixture — CLI ignores README content and only enforces protected-dir guard', async () => {
    // The fixture README contains "rm -rf ~/.claude" but the CLI should not read/execute it.
    // The only safety boundary is the protected-dir guard on the clone *target path*.
    // When the target is NOT protected, install completes normally (README content is irrelevant).
    const fixturePath = path.resolve(import.meta.dirname, '../fixtures/adversarial-readme');

    // Ensure the fixture directory exists and contains the adversarial README
    const readmePath = path.join(fixturePath, 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf8');
    expect(readmeContent).toContain('rm -rf ~/.claude');

    // Clone target is NOT a protected dir — install should succeed normally
    mockIsProtected.mockReturnValue(false);
    await install('owner/repo', { cwd: FAKE_CWD });

    // CLI did not parse README — only cloneRepo was called
    expect(mockCloneRepo).toHaveBeenCalledOnce();
    expect(mockAddRecord).toHaveBeenCalledOnce();

    // Now verify: if the clone *target itself* were a protected dir, the guard fires
    vi.clearAllMocks();
    defaultMocks();
    mockIsProtected.mockReturnValue(true);

    await expect(install('owner/repo', { cwd: FAKE_CWD })).rejects.toThrow(
      /Refusing to install into protected directory/i,
    );
    expect(mockCloneRepo).not.toHaveBeenCalled();
  });

  // (k) FIX-2: GIT_INSTALL_NONINTERACTIVE=1 skips assertTTY
  it('(k) GIT_INSTALL_NONINTERACTIVE=1 skips assertTTY even when it would throw', async () => {
    process.env.GIT_INSTALL_NONINTERACTIVE = '1';
    mockAssertTTY.mockImplementation(() => {
      throw new Error('TTY required');
    });

    // Should succeed despite assertTTY throwing — it is bypassed
    await expect(install('owner/repo', { cwd: FAKE_CWD })).resolves.toBeUndefined();
    expect(mockAssertTTY).not.toHaveBeenCalled();
    expect(mockCloneRepo).toHaveBeenCalledOnce();
  });

  // (l) FIX-3: symlink target → SafetyError
  it('(l) rejects with SafetyError when target path is a symlink', async () => {
    // lstat returns stats indicating a symlink at targetDir
    mockLstat.mockResolvedValue({
      isSymbolicLink: () => true,
    } as import('node:fs').Stats);

    const err = await install('owner/repo', { cwd: FAKE_CWD }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SafetyError);
    expect((err as Error).message).toMatch(/symlink/i);
    expect(mockCloneRepo).not.toHaveBeenCalled();
  });

  // releaseLock called even on error (finally block)
  it('releaseLock is called in finally even when clone fails', async () => {
    mockCloneRepo.mockRejectedValue(new Error('git clone failed'));

    await expect(install('owner/repo', { cwd: FAKE_CWD })).rejects.toThrow(/clone failed/i);
    expect(mockReleaseLock).toHaveBeenCalled();
  });
});
