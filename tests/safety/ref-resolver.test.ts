import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock execa before importing the module under test
vi.mock('execa');

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { resolveRef } from '../../src/safety/ref-resolver.js';
import { execa } from 'execa';

const mockExeca = vi.mocked(execa);

// Helper: build an ENOENT error (gh not on PATH)
function enoentError() {
  const err = new Error('spawn gh ENOENT') as NodeJS.ErrnoException;
  err.code = 'ENOENT';
  return err;
}

// Helper: build a generic command failure
function cmdError(msg = 'command failed') {
  return new Error(msg);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// (a) resolveRef('owner/repo') — no ref → default branch HEAD via gh api
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveRef — default branch (no ref)', () => {
  it('(a) returns sha from gh api repos/{owner}/{repo}/commits/HEAD', async () => {
    const sha = 'aabbccdd1122334455667788990011aabbccdd11';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    const result = await resolveRef('owner/repo');

    expect(result.sha).toBe(sha);
    expect(result.mutable).toBe(true);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain(sha);
  });

  it('(a) calls gh api with correct endpoint', async () => {
    const sha = 'aabbccdd1122334455667788990011aabbccdd11';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    await resolveRef('owner/repo');

    expect(mockExeca).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['api', expect.stringContaining('repos/owner/repo/commits')]),
      expect.any(Object),
    );
  });

  it('(a) warning mentions "mutable" or "default branch"', async () => {
    const sha = 'aabbccdd1122334455667788990011aabbccdd11';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    const result = await resolveRef('owner/repo');

    expect(result.warning).toMatch(/mutable|default.branch/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (b) resolveRef('owner/repo', 'abc1234567...') — full SHA pass-through
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveRef — explicit SHA pass-through', () => {
  it('(b) returns sha as-is when ref is a 40-char hex string', async () => {
    const sha = 'aabbccdd1122334455667788990011aabbccdd11';
    const result = await resolveRef('owner/repo', sha);

    expect(result.sha).toBe(sha);
    expect(result.mutable).toBe(false);
    expect(result.warning).toBeUndefined();
    // execa should NOT be called — it's a pass-through
    expect(mockExeca).not.toHaveBeenCalled();
  });

  it('(b) short SHA (7 chars) is also treated as SHA pass-through', async () => {
    const sha = 'abc1234';
    const result = await resolveRef('owner/repo', sha);

    expect(result.sha).toBe(sha);
    expect(result.mutable).toBe(false);
    expect(mockExeca).not.toHaveBeenCalled();
  });

  it('(b) 12-char hex is pass-through', async () => {
    const sha = 'abc123def456';
    const result = await resolveRef('owner/repo', sha);

    expect(result.sha).toBe(sha);
    expect(result.mutable).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (c) resolveRef('owner/repo', 'v1.2.3') — tag → resolve to SHA via gh api
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveRef — tag ref', () => {
  it('(c) resolves tag to SHA via gh api', async () => {
    const sha = '1234567890abcdef1234567890abcdef12345678';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    const result = await resolveRef('owner/repo', 'v1.2.3');

    expect(result.sha).toBe(sha);
    expect(result.mutable).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('(c) warning mentions "tag" and the sha', async () => {
    const sha = '1234567890abcdef1234567890abcdef12345678';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    const result = await resolveRef('owner/repo', 'v1.2.3');

    expect(result.warning).toMatch(/tag/i);
    expect(result.warning).toContain(sha);
  });

  it('(c) calls gh api with the tag ref', async () => {
    const sha = '1234567890abcdef1234567890abcdef12345678';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    await resolveRef('owner/repo', 'v1.2.3');

    expect(mockExeca).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['api', expect.stringContaining('v1.2.3')]),
      expect.any(Object),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (d) resolveRef('owner/repo', 'main') — branch name → resolve via gh api
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveRef — branch name', () => {
  it('(d) resolves branch to SHA, mutable=true', async () => {
    const sha = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    const result = await resolveRef('owner/repo', 'main');

    expect(result.sha).toBe(sha);
    expect(result.mutable).toBe(true);
  });

  it('(d) warning text is present and informative', async () => {
    const sha = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    const result = await resolveRef('owner/repo', 'main');

    expect(result.warning).toBeDefined();
    expect(typeof result.warning).toBe('string');
    expect((result.warning as string).length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (e) Warning text on mutable refs is clear
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveRef — warning text clarity', () => {
  it('(e) warning on default branch mentions "mutable ref" and resolved sha', async () => {
    const sha = 'aaaa1111bbbb2222cccc3333dddd4444eeee5555';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    const result = await resolveRef('owner/repo');

    expect(result.warning).toContain(sha);
    expect(result.warning).toMatch(/mutable/i);
  });

  it('(e) warning on tag mentions sha', async () => {
    const sha = '1111aaaa2222bbbb3333cccc4444dddd5555eeee';
    mockExeca.mockResolvedValueOnce({ stdout: sha, stderr: '' } as never);

    const result = await resolveRef('owner/repo', 'v2.0.0');

    expect(result.warning).toContain(sha);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (f) Fallback to git ls-remote when gh not on PATH (ENOENT)
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveRef — git ls-remote fallback', () => {
  it('(f) falls back to git ls-remote when gh throws ENOENT', async () => {
    const sha = 'cafebabecafebabecafebabecafebabecafebabe';
    // First call (gh api) → ENOENT
    mockExeca.mockRejectedValueOnce(enoentError());
    // Second call (git ls-remote) → success with ls-remote output format
    mockExeca.mockResolvedValueOnce({
      stdout: `${sha}\trefs/heads/main`,
      stderr: '',
    } as never);

    const result = await resolveRef('owner/repo', 'main');

    expect(result.sha).toBe(sha);
    expect(result.mutable).toBe(true);
  });

  it('(f) git ls-remote called with correct URL format and SAFE_GIT_FLAGS', async () => {
    const sha = 'cafebabecafebabecafebabecafebabecafebabe';
    mockExeca.mockRejectedValueOnce(enoentError());
    mockExeca.mockResolvedValueOnce({
      stdout: `${sha}\trefs/heads/main`,
      stderr: '',
    } as never);

    await resolveRef('owner/repo', 'main');

    // Second call should be git ls-remote with SAFE_GIT_FLAGS (FIX-4)
    const secondCall = mockExeca.mock.calls[1];
    expect(secondCall[0]).toBe('git');
    expect(secondCall[1]).toEqual(
      expect.arrayContaining(['-c', 'core.hooksPath=/dev/null', 'ls-remote']),
    );
  });

  it('(f) git ls-remote for default branch (no ref) resolves HEAD', async () => {
    const sha = 'cafebabecafebabecafebabecafebabecafebabe';
    mockExeca.mockRejectedValueOnce(enoentError());
    mockExeca.mockResolvedValueOnce({
      stdout: `${sha}\tHEAD`,
      stderr: '',
    } as never);

    const result = await resolveRef('owner/repo');

    expect(result.sha).toBe(sha);
    expect(result.mutable).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (g) GitHub REST API fallback when both gh and git fail
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveRef — GitHub REST API fallback', () => {
  it('(g) falls back to fetch when both gh and git fail', async () => {
    const sha = 'feed1234feed1234feed1234feed1234feed1234';
    // gh fails with ENOENT
    mockExeca.mockRejectedValueOnce(enoentError());
    // git ls-remote also fails
    mockExeca.mockRejectedValueOnce(cmdError('git not found'));
    // fetch succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sha }),
    });

    const result = await resolveRef('owner/repo', 'main');

    expect(result.sha).toBe(sha);
    expect(result.mutable).toBe(true);
  });

  it('(g) fetch called with correct GitHub REST URL', async () => {
    const sha = 'feed1234feed1234feed1234feed1234feed1234';
    mockExeca.mockRejectedValueOnce(enoentError());
    mockExeca.mockRejectedValueOnce(cmdError('git not found'));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sha }),
    });

    await resolveRef('owner/repo', 'main');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.github.com/repos/owner/repo/commits/main'),
    );
  });

  it('(g) fetch for default branch uses HEAD', async () => {
    const sha = 'feed1234feed1234feed1234feed1234feed1234';
    mockExeca.mockRejectedValueOnce(enoentError());
    mockExeca.mockRejectedValueOnce(cmdError('git not found'));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sha }),
    });

    await resolveRef('owner/repo');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.github.com/repos/owner/repo/commits/HEAD'),
    );
  });

  it('(g) throws when all three methods fail', async () => {
    mockExeca.mockRejectedValueOnce(enoentError());
    mockExeca.mockRejectedValueOnce(cmdError('git not found'));
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not Found' }),
    });

    await expect(resolveRef('owner/repo', 'main')).rejects.toThrow();
  });
});
