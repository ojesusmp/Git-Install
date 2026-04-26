import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { MissingPrereqError } from '../lib/exit-codes.js';
import { atomicWrite } from '../safety/atomicity.js';

export interface SetupOptions {
  claude?: boolean;
  codex?: boolean;
  both?: boolean;
}

function packageRoot(): string {
  // tsup bundles src/cli.ts and its imports into a single dist/cli.js
  // so import.meta.url points to dist/cli.js at runtime
  const thisFile = fileURLToPath(import.meta.url);
  // go up one level: dist/ -> package root
  return path.resolve(path.dirname(thisFile), '..');
}

function skillsSrcRoot(): string {
  const envOverride = process.env['GIT_INSTALL_SKILLS_SRC'];
  if (envOverride) return envOverride;
  return path.join(packageRoot(), 'dist', 'skills');
}

function homeDir(): string {
  const envOverride = process.env['GIT_INSTALL_HOME'];
  if (envOverride) return envOverride;
  return os.homedir();
}

async function checkNodeVersion(): Promise<void> {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  if (major < 20) {
    throw new MissingPrereqError(
      `Node.js >= 20 is required (found ${process.versions.node}). ` +
        'Please upgrade Node.js and try again.',
    );
  }
}

async function isCommandAvailable(cmd: string): Promise<boolean> {
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    await execa(whichCmd, [cmd]);
    return true;
  } catch {
    return false;
  }
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkDir(full);
      results.push(...nested);
    } else {
      results.push(full);
    }
  }
  return results;
}

async function installSkills(
  target: 'claude' | 'codex',
  skillsSrc: string,
  home: string,
): Promise<void> {
  const srcDir = path.join(skillsSrc, target, 'install-repo');
  const destBase =
    target === 'claude'
      ? path.join(home, '.claude', 'skills', 'install-repo')
      : path.join(home, '.codex', 'skills', 'install-repo');

  const files = await walkDir(srcDir);
  let count = 0;

  for (const srcFile of files) {
    const relative = path.relative(srcDir, srcFile);
    const destFile = path.join(destBase, relative);
    const content = await fs.readFile(srcFile);
    await atomicWrite(destFile, content);

    // Sanity check: verify written file exists
    await fs.access(destFile);
    count++;
  }

  const displayPath =
    target === 'claude' ? '~/.claude/skills/install-repo' : '~/.codex/skills/install-repo';

  console.log(
    `Installed ${target === 'claude' ? 'Claude' : 'Codex'} skill to ${displayPath} (${count} file${count !== 1 ? 's' : ''})`,
  );
}

export async function setup(opts: SetupOptions): Promise<void> {
  // Resolve targets: --both overrides individual flags
  const installClaude = opts.both === true || opts.claude === true;
  const installCodex = opts.both === true || opts.codex === true;

  if (!installClaude && !installCodex) {
    throw new Error('No install target specified. Use --claude, --codex, or --both.');
  }

  // Pre-flight: Node >= 20
  await checkNodeVersion();

  // Pre-flight: report gh availability (informational only)
  const ghAvailable = await isCommandAvailable('gh');
  if (ghAvailable) {
    console.log('gh is available on PATH.');
  } else {
    console.log('gh is not on PATH (optional — some features may require it).');
  }

  const skillsSrc = skillsSrcRoot();
  const home = homeDir();

  if (installClaude) {
    await installSkills('claude', skillsSrc, home);
  }

  if (installCodex) {
    await installSkills('codex', skillsSrc, home);
  }
}
