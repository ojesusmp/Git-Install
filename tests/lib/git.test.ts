import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('git lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cloneRepo', () => {
    it('calls git with -c core.hooksPath=/dev/null clone args', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockResolvedValue({ stdout: '' } as never);

      const { cloneRepo } = await import('../../src/lib/git.ts');
      await cloneRepo('https://github.com/owner/repo.git', '/tmp/target');

      expect(mockExeca).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['-c', 'core.hooksPath=/dev/null', 'clone']),
      );
    });

    it('includes url and targetDir in clone args', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockResolvedValue({ stdout: '' } as never);

      const { cloneRepo } = await import('../../src/lib/git.ts');
      await cloneRepo('https://github.com/owner/repo.git', '/tmp/my-repo');

      expect(mockExeca).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['clone', 'https://github.com/owner/repo.git', '/tmp/my-repo']),
      );
    });

    it('calls checkoutRef when ref is provided', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockResolvedValue({ stdout: '' } as never);

      const { cloneRepo } = await import('../../src/lib/git.ts');
      await cloneRepo('https://github.com/owner/repo.git', '/tmp/target', 'abc123def456');

      // Should be called twice: once for clone, once for checkout
      expect(mockExeca).toHaveBeenCalledTimes(2);
      expect(mockExeca).toHaveBeenLastCalledWith(
        'git',
        expect.arrayContaining(['-c', 'core.hooksPath=/dev/null', 'checkout', 'abc123def456']),
      );
    });

    it('propagates clone errors with clear message', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockRejectedValueOnce(new Error('Repository not found'));

      const { cloneRepo } = await import('../../src/lib/git.ts');
      await expect(cloneRepo('https://github.com/bad/repo.git', '/tmp/bad')).rejects.toThrow(
        /clone|Repository not found/i,
      );
    });
  });

  describe('checkoutRef', () => {
    it('calls git with -c core.hooksPath=/dev/null -C dir checkout sha', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockResolvedValue({ stdout: '' } as never);

      const { checkoutRef } = await import('../../src/lib/git.ts');
      await checkoutRef('/tmp/my-repo', 'deadbeef1234');

      expect(mockExeca).toHaveBeenCalledWith('git', [
        '-c',
        'core.hooksPath=/dev/null',
        '-C',
        '/tmp/my-repo',
        'checkout',
        'deadbeef1234',
      ]);
    });

    it('propagates checkout errors', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockRejectedValueOnce(new Error('SHA not found'));

      const { checkoutRef } = await import('../../src/lib/git.ts');
      await expect(checkoutRef('/tmp/repo', 'badshaXXX')).rejects.toThrow(
        /SHA not found|checkout/i,
      );
    });
  });

  describe('revParseHead', () => {
    it('returns trimmed SHA from git rev-parse HEAD stdout', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockResolvedValueOnce({ stdout: 'abc123def456\n' } as never);

      const { revParseHead } = await import('../../src/lib/git.ts');
      const sha = await revParseHead('/tmp/my-repo');

      expect(sha).toBe('abc123def456');
    });

    it('calls git rev-parse HEAD with -C dir', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockResolvedValueOnce({ stdout: 'abc123\n' } as never);

      const { revParseHead } = await import('../../src/lib/git.ts');
      await revParseHead('/some/repo');

      expect(mockExeca).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['-C', '/some/repo', 'rev-parse', 'HEAD']),
      );
    });

    it('uses -c core.hooksPath=/dev/null for rev-parse', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockResolvedValueOnce({ stdout: 'abc123\n' } as never);

      const { revParseHead } = await import('../../src/lib/git.ts');
      await revParseHead('/some/repo');

      expect(mockExeca).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['-c', 'core.hooksPath=/dev/null']),
      );
    });

    it('propagates rev-parse errors', async () => {
      const { execa } = await import('execa');
      const mockExeca = vi.mocked(execa);
      mockExeca.mockRejectedValueOnce(new Error('Not a git repository'));

      const { revParseHead } = await import('../../src/lib/git.ts');
      await expect(revParseHead('/not/a/repo')).rejects.toThrow(/rev-parse|git repository/i);
    });
  });
});
