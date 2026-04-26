import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
}));

describe('prompt lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env var
    delete process.env.GIT_INSTALL_NONINTERACTIVE;
  });

  afterEach(() => {
    delete process.env.GIT_INSTALL_NONINTERACTIVE;
  });

  describe('assertTTY', () => {
    it('throws when process.stdin.isTTY is falsy', async () => {
      const original = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

      const { assertTTY } = await import('../../src/lib/prompt.ts');
      expect(() => assertTTY()).toThrow(/TTY required/i);

      Object.defineProperty(process.stdin, 'isTTY', { value: original, configurable: true });
    });

    it('does not throw when process.stdin.isTTY is true', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      const { assertTTY } = await import('../../src/lib/prompt.ts');
      expect(() => assertTTY()).not.toThrow();
    });
  });

  describe('confirmInstall', () => {
    it('returns true when input is exactly "confirm"', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      const { input } = await import('@inquirer/prompts');
      vi.mocked(input).mockResolvedValueOnce('confirm');

      const { confirmInstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmInstall('Install plan: owner/repo');
      expect(result).toBe(true);
    });

    it('returns false when input is "Confirm" (wrong case)', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      const { input } = await import('@inquirer/prompts');
      vi.mocked(input).mockResolvedValueOnce('Confirm');

      const { confirmInstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmInstall('Install plan: owner/repo');
      expect(result).toBe(false);
    });

    it('returns false when input is "confirm " (trailing space)', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      const { input } = await import('@inquirer/prompts');
      vi.mocked(input).mockResolvedValueOnce('confirm ');

      const { confirmInstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmInstall('Install plan: owner/repo');
      expect(result).toBe(false);
    });

    it('returns false when input is "yes"', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      const { input } = await import('@inquirer/prompts');
      vi.mocked(input).mockResolvedValueOnce('yes');

      const { confirmInstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmInstall('Install plan: owner/repo');
      expect(result).toBe(false);
    });

    it('returns false when input is empty string', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      const { input } = await import('@inquirer/prompts');
      vi.mocked(input).mockResolvedValueOnce('');

      const { confirmInstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmInstall('Install plan: owner/repo');
      expect(result).toBe(false);
    });

    it('auto-confirms and returns true when GIT_INSTALL_NONINTERACTIVE=1', async () => {
      process.env.GIT_INSTALL_NONINTERACTIVE = '1';
      const { input } = await import('@inquirer/prompts');

      const { confirmInstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmInstall('Install plan: owner/repo');
      expect(result).toBe(true);
      // Should not prompt user
      expect(input).not.toHaveBeenCalled();
    });
  });

  describe('confirmUninstall', () => {
    it('returns true when input is exactly "confirm uninstall"', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      const { input } = await import('@inquirer/prompts');
      vi.mocked(input).mockResolvedValueOnce('confirm uninstall');

      const { confirmUninstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmUninstall('Uninstall plan: owner/repo');
      expect(result).toBe(true);
    });

    it('returns false when input is just "confirm"', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      const { input } = await import('@inquirer/prompts');
      vi.mocked(input).mockResolvedValueOnce('confirm');

      const { confirmUninstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmUninstall('Uninstall plan: owner/repo');
      expect(result).toBe(false);
    });

    it('returns false when input is "Confirm Uninstall" (wrong case)', async () => {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      const { input } = await import('@inquirer/prompts');
      vi.mocked(input).mockResolvedValueOnce('Confirm Uninstall');

      const { confirmUninstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmUninstall('Uninstall plan: owner/repo');
      expect(result).toBe(false);
    });

    it('auto-confirms and returns true when GIT_INSTALL_NONINTERACTIVE=1', async () => {
      process.env.GIT_INSTALL_NONINTERACTIVE = '1';
      const { input } = await import('@inquirer/prompts');

      const { confirmUninstall } = await import('../../src/lib/prompt.ts');
      const result = await confirmUninstall('Uninstall plan: owner/repo');
      expect(result).toBe(true);
      expect(input).not.toHaveBeenCalled();
    });
  });
});
