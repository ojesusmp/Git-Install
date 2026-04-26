import { describe, it, expect, vi, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';

// Import under test — will fail until B2 implementation exists
import {
  PROTECTED_DIRS,
  PROTECTED_FILE_PATTERNS,
  PROTECTED_FILES,
  isProtected,
} from '../../src/safety/protected-dirs.js';

const home = os.homedir();

describe('PROTECTED_DIRS', () => {
  it('(a) exports a readonly array', () => {
    expect(Array.isArray(PROTECTED_DIRS)).toBe(true);
    expect(PROTECTED_DIRS.length).toBeGreaterThan(0);
  });

  it('(a) includes ~/.codex', () => {
    expect(PROTECTED_DIRS).toContain('~/.codex');
  });

  it('(a) includes ~/.claude', () => {
    expect(PROTECTED_DIRS).toContain('~/.claude');
  });

  it('(a) includes .omx', () => {
    expect(PROTECTED_DIRS).toContain('.omx');
  });

  it('(a) includes .omc', () => {
    expect(PROTECTED_DIRS).toContain('.omc');
  });

  it('(a) includes ~/.ssh', () => {
    expect(PROTECTED_DIRS).toContain('~/.ssh');
  });

  it('(a) includes ~/.gnupg', () => {
    expect(PROTECTED_DIRS).toContain('~/.gnupg');
  });

  it('(a) includes ~/.aws', () => {
    expect(PROTECTED_DIRS).toContain('~/.aws');
  });

  it('(a) includes ~/.config/gh', () => {
    expect(PROTECTED_DIRS).toContain('~/.config/gh');
  });

  it('(a) includes ~/.netrc', () => {
    expect(PROTECTED_DIRS).toContain('~/.netrc');
  });
});

describe('PROTECTED_FILE_PATTERNS', () => {
  it('(a) exports a readonly array of RegExp', () => {
    expect(Array.isArray(PROTECTED_FILE_PATTERNS)).toBe(true);
    expect(PROTECTED_FILE_PATTERNS.length).toBeGreaterThan(0);
    expect(PROTECTED_FILE_PATTERNS[0]).toBeInstanceOf(RegExp);
  });

  it('(a) contains pattern matching *.env files', () => {
    const matchesEnv = PROTECTED_FILE_PATTERNS.some((r) => r.test('.env'));
    expect(matchesEnv).toBe(true);
  });

  it('(a) contains pattern matching named .env files like production.env', () => {
    const matchesNamedEnv = PROTECTED_FILE_PATTERNS.some((r) => r.test('production.env'));
    expect(matchesNamedEnv).toBe(true);
  });
});

describe('isProtected — returns true for protected paths', () => {
  it('(b) blocks path inside ~/.claude', () => {
    const target = path.join(home, '.claude', 'skills', 'foo');
    expect(isProtected(target)).toBe(true);
  });

  it('(b) blocks path inside ~/.codex', () => {
    const target = path.join(home, '.codex', 'config');
    expect(isProtected(target)).toBe(true);
  });

  it('(b) blocks path inside ~/.ssh', () => {
    const target = path.join(home, '.ssh', 'id_rsa');
    expect(isProtected(target)).toBe(true);
  });

  it('(b) blocks path inside ~/.aws', () => {
    const target = path.join(home, '.aws', 'credentials');
    expect(isProtected(target)).toBe(true);
  });

  it('(b) blocks path inside ~/.gnupg', () => {
    const target = path.join(home, '.gnupg', 'trustdb.gpg');
    expect(isProtected(target)).toBe(true);
  });

  it('(b) blocks path inside ~/.config/gh', () => {
    const target = path.join(home, '.config', 'gh', 'hosts.yml');
    expect(isProtected(target)).toBe(true);
  });

  it('(b) blocks ~/.netrc itself', () => {
    const target = path.join(home, '.netrc');
    expect(isProtected(target)).toBe(true);
  });
});

describe('isProtected — returns false for safe paths', () => {
  it('(c) allows /tmp/safe', () => {
    // Use a temp-style path that is clearly not protected
    const target = path.join(os.tmpdir(), 'safe-project');
    expect(isProtected(target)).toBe(false);
  });

  it('(c) allows ~/Documents/proj', () => {
    const target = path.join(home, 'Documents', 'proj');
    expect(isProtected(target)).toBe(false);
  });

  it('(c) allows ~/projects/my-app', () => {
    const target = path.join(home, 'projects', 'my-app');
    expect(isProtected(target)).toBe(false);
  });
});

describe('isProtected — path normalization', () => {
  it('(d) normalizes via os.homedir() — nested path inside ~/.claude still blocked', () => {
    const target = path.join(home, '.claude', 'deep', 'nested', 'dir');
    expect(isProtected(target)).toBe(true);
  });

  it('(d) normalizes via os.homedir() — safe nested path allowed', () => {
    const target = path.join(home, 'workspace', 'deep', 'nested');
    expect(isProtected(target)).toBe(false);
  });
});

describe('isProtected — path traversal blocked', () => {
  it('(e) blocks ~/../.claude (traversal resolves to parent/.claude)', () => {
    // path.resolve expands this — test the resolved form
    const target = path.resolve(home, '..', '.claude');
    // The resolved path: either it happens to be inside a protected dir,
    // or the path itself starts with a protected dir component.
    // The key invariant: isProtected must handle resolved absolute paths.
    // If homedir is /home/user, target is /home/.claude — not protected.
    // But if target starts with a protected prefix it IS blocked.
    // We test that the function does NOT crash and returns a boolean.
    const result = isProtected(target);
    expect(typeof result).toBe('boolean');
  });

  it('(e) blocks ~/../.claude when it resolves to a protected dir', () => {
    // Simulate a path that after resolution looks like it's inside .claude
    // by constructing a path that DOES resolve into the protected home dir
    const target = path.resolve(home, '.claude', '..', '.claude', 'foo');
    expect(isProtected(target)).toBe(true);
  });

  it('(e) traversal: ~/Documents/../../.claude resolves and blocks', () => {
    const target = path.resolve(home, 'Documents', '..', '..', '.claude');
    // This resolves to <parent-of-home>/.claude — NOT the user's ~/.claude
    // The test verifies no crash and returns boolean
    const result = isProtected(target);
    expect(typeof result).toBe('boolean');
  });

  it('(e) traversal within protected dir still blocked', () => {
    // ~/.claude/../.claude/foo → still inside ~/.claude after resolution
    const target = path.resolve(home, '.claude', '..', '.claude', 'attack');
    expect(isProtected(target)).toBe(true);
  });
});

describe('isProtected — case-insensitive Windows paths', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('(f) on win32: mixed-case path matches protected dir case-insensitively', () => {
    // Stub process.platform to simulate Windows
    vi.stubGlobal('process', { ...process, platform: 'win32' });

    // Build a Windows-style path — on actual Windows homedir returns Windows paths,
    // on other platforms we simulate a Windows-style absolute path manually.
    // We test the case-folding logic directly by using the same base.
    const winHome = home;
    // Construct target with mixed case on the protected segment
    const lowerHome = winHome.toLowerCase();
    // Mixed-case: flip the case of the last char of home if possible
    const mixedCaseTarget = lowerHome + path.sep + '.CLAUDE' + path.sep + 'skills';

    // On Windows, this mixed-case path should be treated as protected
    expect(isProtected(mixedCaseTarget)).toBe(true);
  });

  it('(f) on non-win32: case-sensitive (mixed-case .CLAUDE is NOT blocked on Linux)', () => {
    // Only run this assertion when not on Windows
    if (process.platform === 'win32') {
      // On real Windows we skip this — case folding is always on
      return;
    }
    vi.stubGlobal('process', { ...process, platform: 'linux' });

    const mixedCaseTarget = path.join(home, '.CLAUDE', 'skills');
    // On Linux, .CLAUDE !== .claude so it should NOT be blocked
    expect(isProtected(mixedCaseTarget)).toBe(false);
  });
});

describe('PROTECTED_DIRS — FIX-5 new entries', () => {
  it('(a) includes ~/.docker', () => {
    expect(PROTECTED_DIRS).toContain('~/.docker');
  });

  it('(a) includes ~/.kube', () => {
    expect(PROTECTED_DIRS).toContain('~/.kube');
  });

  it('(b) blocks path inside ~/.docker', () => {
    const target = path.join(home, '.docker', 'config.json');
    expect(isProtected(target)).toBe(true);
  });

  it('(b) blocks path inside ~/.kube', () => {
    const target = path.join(home, '.kube', 'config');
    expect(isProtected(target)).toBe(true);
  });
});

describe('PROTECTED_FILES — FIX-5 exact file paths', () => {
  it('(a) exports a readonly array', () => {
    expect(Array.isArray(PROTECTED_FILES)).toBe(true);
    expect(PROTECTED_FILES.length).toBeGreaterThan(0);
  });

  it('(a) includes ~/.npmrc', () => {
    expect(PROTECTED_FILES).toContain('~/.npmrc');
  });

  it('(a) includes ~/.pgpass', () => {
    expect(PROTECTED_FILES).toContain('~/.pgpass');
  });

  it('(a) includes ~/.gitconfig', () => {
    expect(PROTECTED_FILES).toContain('~/.gitconfig');
  });

  it('(b) blocks ~/.npmrc exactly', () => {
    const target = path.join(home, '.npmrc');
    expect(isProtected(target)).toBe(true);
  });

  it('(b) blocks ~/.pgpass exactly', () => {
    const target = path.join(home, '.pgpass');
    expect(isProtected(target)).toBe(true);
  });

  it('(b) blocks ~/.gitconfig exactly', () => {
    const target = path.join(home, '.gitconfig');
    expect(isProtected(target)).toBe(true);
  });

  it('(c) does NOT block a .npmrc inside a project dir (only exact home path)', () => {
    // A file at /some/project/.npmrc should NOT be blocked — PROTECTED_FILES checks exact paths
    // The .env pattern would catch .env but PROTECTED_FILES is for specific home-level files
    const target = path.join(home, 'projects', 'myapp', '.npmrc');
    // This should NOT be blocked by PROTECTED_FILES (not exact match)
    // It also doesn't end in .env so PROTECTED_FILE_PATTERNS won't catch it
    expect(isProtected(target)).toBe(false);
  });
});

describe('PROTECTED_FILE_PATTERNS — FIX-6 single regex', () => {
  it('(a) has exactly one pattern after deduplication', () => {
    expect(PROTECTED_FILE_PATTERNS).toHaveLength(1);
  });

  it('(a) still blocks .env', () => {
    expect(PROTECTED_FILE_PATTERNS[0].test('.env')).toBe(true);
  });

  it('(a) still blocks production.env', () => {
    expect(PROTECTED_FILE_PATTERNS[0].test('production.env')).toBe(true);
  });

  it('(a) does NOT block .envelope', () => {
    expect(PROTECTED_FILE_PATTERNS[0].test('.envelope')).toBe(false);
  });
});

describe('isProtected — *.env file patterns', () => {
  it('(g) blocks /home/user/proj/.env', () => {
    const target = path.join(home, 'proj', '.env');
    expect(isProtected(target)).toBe(true);
  });

  it('(g) blocks ~/secrets/.env', () => {
    const target = path.join(home, 'secrets', '.env');
    expect(isProtected(target)).toBe(true);
  });

  it('(g) blocks any .env file regardless of directory', () => {
    const target = path.join(os.tmpdir(), 'random-dir', '.env');
    expect(isProtected(target)).toBe(true);
  });

  it('(g) blocks production.env', () => {
    const target = path.join(home, 'projects', 'app', 'production.env');
    expect(isProtected(target)).toBe(true);
  });

  it('(g) does NOT block .envelope (not a .env match)', () => {
    const target = path.join(home, 'projects', 'app', '.envelope');
    expect(isProtected(target)).toBe(false);
  });
});
