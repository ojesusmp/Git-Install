import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { MissingPrereqError } from '../../src/lib/exit-codes.js';

// Resolve fixture skills source directory relative to this test file
const thisFile = fileURLToPath(import.meta.url);
const fixtureSkillsSrc = path.resolve(path.dirname(thisFile), '..', 'fixtures', 'skills');

let tmpHome: string;

beforeAll(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'git-install-setup-test-'));
});

afterAll(async () => {
  await fs.rm(tmpHome, { recursive: true, force: true });
});

afterEach(async () => {
  // Clean up installed skill dirs between tests so each test starts fresh
  const claudeSkills = path.join(tmpHome, '.claude');
  const codexSkills = path.join(tmpHome, '.codex');
  await fs.rm(claudeSkills, { recursive: true, force: true });
  await fs.rm(codexSkills, { recursive: true, force: true });
});

function runSetup(opts: { claude?: boolean; codex?: boolean; both?: boolean }) {
  // Set env vars before dynamic import so the module picks them up
  process.env['GIT_INSTALL_HOME'] = tmpHome;
  process.env['GIT_INSTALL_SKILLS_SRC'] = fixtureSkillsSrc;
  // Dynamically import to respect env vars; module is stateless so safe
  return import('../../src/commands/setup.js').then(({ setup }) => setup(opts));
}

// ─────────────────────────────────────────────────────────────────────────────
// (a) claude: true → writes Claude SKILL.md
// ─────────────────────────────────────────────────────────────────────────────
describe('setup({ claude: true })', () => {
  it('(a) writes SKILL.md to ~/.claude/skills/install-repo/', async () => {
    await runSetup({ claude: true });
    const dest = path.join(tmpHome, '.claude', 'skills', 'install-repo', 'SKILL.md');
    await expect(fs.access(dest)).resolves.not.toThrow();
    const content = await fs.readFile(dest, 'utf8');
    expect(content).toContain('install-repo');
  });

  it('(a) does NOT write codex files', async () => {
    await runSetup({ claude: true });
    const codexDest = path.join(tmpHome, '.codex', 'skills', 'install-repo');
    await expect(fs.access(codexDest)).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (b) codex: true → writes Codex SKILL.md and agents/openai.yaml
// ─────────────────────────────────────────────────────────────────────────────
describe('setup({ codex: true })', () => {
  it('(b) writes SKILL.md to ~/.codex/skills/install-repo/', async () => {
    await runSetup({ codex: true });
    const dest = path.join(tmpHome, '.codex', 'skills', 'install-repo', 'SKILL.md');
    await expect(fs.access(dest)).resolves.not.toThrow();
  });

  it('(b) writes agents/openai.yaml to ~/.codex/skills/install-repo/agents/', async () => {
    await runSetup({ codex: true });
    const dest = path.join(tmpHome, '.codex', 'skills', 'install-repo', 'agents', 'openai.yaml');
    await expect(fs.access(dest)).resolves.not.toThrow();
  });

  it('(b) does NOT write claude files', async () => {
    await runSetup({ codex: true });
    const claudeDest = path.join(tmpHome, '.claude', 'skills', 'install-repo');
    await expect(fs.access(claudeDest)).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (c) both: true → writes both Claude and Codex
// ─────────────────────────────────────────────────────────────────────────────
describe('setup({ both: true })', () => {
  it('(c) writes Claude SKILL.md', async () => {
    await runSetup({ both: true });
    const dest = path.join(tmpHome, '.claude', 'skills', 'install-repo', 'SKILL.md');
    await expect(fs.access(dest)).resolves.not.toThrow();
  });

  it('(c) writes Codex SKILL.md', async () => {
    await runSetup({ both: true });
    const dest = path.join(tmpHome, '.codex', 'skills', 'install-repo', 'SKILL.md');
    await expect(fs.access(dest)).resolves.not.toThrow();
  });

  it('(c) writes Codex agents/openai.yaml', async () => {
    await runSetup({ both: true });
    const dest = path.join(tmpHome, '.codex', 'skills', 'install-repo', 'agents', 'openai.yaml');
    await expect(fs.access(dest)).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (d) Existing files are backed up then cleaned after successful write
// ─────────────────────────────────────────────────────────────────────────────
describe('atomicWrite backup behavior on overwrite', () => {
  it('(d) overwrites existing file with new content; no .backup-* remains', async () => {
    // First install
    await runSetup({ claude: true });
    const dest = path.join(tmpHome, '.claude', 'skills', 'install-repo', 'SKILL.md');
    const firstContent = await fs.readFile(dest, 'utf8');

    // Second install overwrites
    await runSetup({ claude: true });
    const secondContent = await fs.readFile(dest, 'utf8');
    expect(secondContent).toBe(firstContent); // fixture content unchanged

    // No backup files should remain after success
    const dir = path.dirname(dest);
    const entries = await fs.readdir(dir);
    const backups = entries.filter((e) => e.includes('.backup-'));
    expect(backups).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (e) Node version check
// ─────────────────────────────────────────────────────────────────────────────
describe('Node version check', () => {
  it('(e) throws MissingPrereqError when Node version < 20', async () => {
    const original = process.versions.node;
    // Override the readonly property for the duration of the test
    Object.defineProperty(process.versions, 'node', {
      value: '18.0.0',
      configurable: true,
    });
    try {
      const err = await runSetup({ claude: true }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(MissingPrereqError);
      expect((err as Error).message).toMatch(/Node\.js >= 20/);
    } finally {
      Object.defineProperty(process.versions, 'node', {
        value: original,
        configurable: true,
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (f) Mutual exclusivity: --both overrides individual flags
// ─────────────────────────────────────────────────────────────────────────────
describe('--both overrides individual flags', () => {
  it('(f) claude: true + both: true → both Claude and Codex written', async () => {
    await runSetup({ claude: true, both: true });
    const claudeDest = path.join(tmpHome, '.claude', 'skills', 'install-repo', 'SKILL.md');
    const codexDest = path.join(tmpHome, '.codex', 'skills', 'install-repo', 'SKILL.md');
    await expect(fs.access(claudeDest)).resolves.not.toThrow();
    await expect(fs.access(codexDest)).resolves.not.toThrow();
  });

  it('(f) codex: true + both: true → both Claude and Codex written', async () => {
    await runSetup({ codex: true, both: true });
    const claudeDest = path.join(tmpHome, '.claude', 'skills', 'install-repo', 'SKILL.md');
    const codexDest = path.join(tmpHome, '.codex', 'skills', 'install-repo', 'SKILL.md');
    await expect(fs.access(claudeDest)).resolves.not.toThrow();
    await expect(fs.access(codexDest)).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (g) No flags + no --both → throws clear error
// ─────────────────────────────────────────────────────────────────────────────
describe('no flags provided', () => {
  it('(g) throws when no target is specified', async () => {
    await expect(runSetup({})).rejects.toThrow(/No install target specified/);
  });
});
