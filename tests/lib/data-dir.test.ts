import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import os from 'os';
import path from 'path';

describe('dataDir', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore env
    for (const key of ['XDG_DATA_HOME', 'LOCALAPPDATA']) {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(os, 'homedir').mockReturnValue('/mock/home');
  });

  it('on linux uses XDG_DATA_HOME when set', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    process.env.XDG_DATA_HOME = '/custom/data';

    const { dataDir } = await import('../../src/lib/data-dir.ts');
    const result = dataDir();
    expect(result).toBe(path.join('/custom/data', 'git-install'));
  });

  it('on linux falls back to ~/.local/share/git-install when XDG_DATA_HOME unset', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    delete process.env.XDG_DATA_HOME;

    const { dataDir } = await import('../../src/lib/data-dir.ts');
    const result = dataDir();
    expect(result).toBe(path.join('/mock/home', '.local', 'share', 'git-install'));
  });

  it('on darwin uses ~/Library/Application Support/git-install', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
    delete process.env.XDG_DATA_HOME;

    const { dataDir } = await import('../../src/lib/data-dir.ts');
    const result = dataDir();
    expect(result).toBe(path.join('/mock/home', 'Library', 'Application Support', 'git-install'));
  });

  it('on win32 uses LOCALAPPDATA/git-install when set', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    process.env.LOCALAPPDATA = 'C:\\Users\\user\\AppData\\Local';

    const { dataDir } = await import('../../src/lib/data-dir.ts');
    const result = dataDir();
    expect(result).toBe(path.join('C:\\Users\\user\\AppData\\Local', 'git-install'));
  });

  it('on win32 falls back to homedir when LOCALAPPDATA unset', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    delete process.env.LOCALAPPDATA;

    const { dataDir } = await import('../../src/lib/data-dir.ts');
    const result = dataDir();
    expect(result).toBe(path.join('/mock/home', 'git-install'));
  });

  it('on unknown platform falls back to ~/.git-install', async () => {
    Object.defineProperty(process, 'platform', { value: 'freebsd', configurable: true });
    delete process.env.XDG_DATA_HOME;

    const { dataDir } = await import('../../src/lib/data-dir.ts');
    const result = dataDir();
    expect(result).toBe(path.join('/mock/home', '.git-install'));
  });
});
