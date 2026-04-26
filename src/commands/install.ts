import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import pc from 'picocolors';
import { select } from '@inquirer/prompts';
import { recoverFromInterrupt } from '../safety/atomicity.js';
import { isProtected } from '../safety/protected-dirs.js';
import { resolveRef } from '../safety/ref-resolver.js';
import { cloneRepo, revParseHead } from '../lib/git.js';
import { searchRepos } from '../lib/github.js';
import { assertTTY, confirmInstall } from '../lib/prompt.js';
import { addRecord } from '../lib/install-record.js';
import { acquireLock, releaseLock } from '../lib/lockfile.js';
import { SafetyError, UserCancelError } from '../lib/exit-codes.js';

export interface InstallOptions {
  force?: boolean;
  cwd?: string;
}

/**
 * Parse a query string into { repo: "owner/repo", ref?: string }.
 *
 * Handled formats:
 *   owner/repo
 *   owner/repo@v1.2
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/branch
 */
function parseQuery(query: string): { repo: string; ref?: string } | null {
  // Full GitHub URL with optional /tree/<ref>
  const urlMatch = query.match(
    /^https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\/tree\/(.+))?(?:\.git)?(?:\/.*)?$/,
  );
  if (urlMatch) {
    const repo = urlMatch[1];
    const ref = urlMatch[2] ?? undefined;
    return { repo, ref };
  }

  // owner/repo or owner/repo@ref (no slashes in ref part for simple short-form)
  const shortMatch = query.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:@(.+))?$/);
  if (shortMatch) {
    const repo = shortMatch[1];
    const ref = shortMatch[2] ?? undefined;
    return { repo, ref };
  }

  return null;
}

export async function install(query: string, opts?: InstallOptions): Promise<void> {
  const cwd = opts?.cwd ?? process.cwd();
  const installedReposDir = path.resolve(cwd, 'installed-repos');

  // Step 1: Recover from interrupt
  await recoverFromInterrupt(installedReposDir);

  // Step 2: Acquire lock
  await acquireLock({ force: opts?.force });

  try {
    // Step 3: TTY check (FIX-2: respect NONINTERACTIVE bypass)
    if (process.env.GIT_INSTALL_NONINTERACTIVE !== '1') {
      assertTTY();
    }

    // Step 4: Parse query
    let repo: string;
    let ref: string | undefined;

    const parsed = parseQuery(query);
    if (parsed) {
      repo = parsed.repo;
      ref = parsed.ref;
    } else {
      // Search fallback
      const results = await searchRepos(query);
      if (results.length === 0) {
        throw new Error(`No repositories found for query: "${query}"`);
      }

      if (results.length === 1) {
        repo = results[0].fullName;
        ref = undefined;
      } else {
        const choices = results.map((r, i) => ({
          name: `${i + 1}. ${r.fullName}${r.description ? ` - ${r.description}` : ''}`,
          value: r.fullName,
        }));
        repo = await select({ message: 'Select a repository to install:', choices });
        ref = undefined;
      }
    }

    // Step 5: Resolve ref
    const { sha, mutable, warning } = await resolveRef(repo, ref);

    // Step 6: Compute target dir
    const repoName = repo.split('/')[1];
    const targetDir = path.resolve(cwd, 'installed-repos', repoName);

    // Step 7: Protected-dir guard (FIX-3: symlink TOCTOU + FIX-1: typed errors)
    let resolvedTarget = targetDir;
    try {
      resolvedTarget = await fs.realpath(targetDir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      // Path doesn't exist yet — also check parent isn't a symlink
      try {
        const parent = path.dirname(targetDir);
        const parentReal = await fs.realpath(parent);
        resolvedTarget = path.join(parentReal, path.basename(targetDir));
      } catch (parentErr) {
        if ((parentErr as NodeJS.ErrnoException).code !== 'ENOENT') throw parentErr;
        // Parent doesn't exist either; resolvedTarget stays as targetDir
      }
    }
    try {
      const stat = await fs.lstat(targetDir);
      if (stat.isSymbolicLink()) {
        throw new SafetyError(`Refusing to install: target is a symlink: ${targetDir}`);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    if (isProtected(resolvedTarget)) {
      throw new SafetyError(`Refusing to install into protected directory: ${resolvedTarget}`);
    }

    // Step 8: Display install plan
    const shortSha = sha.slice(0, 10);
    const mutableLine = mutable ? `yes${warning ? ` (warning: ${warning})` : ''}` : 'no';
    const plan =
      `Install plan:\n` +
      `  Repository: ${repo}\n` +
      `  Ref:        ${ref ?? 'HEAD'} (resolved to ${shortSha}...)\n` +
      `  Mutable:    ${mutableLine}\n` +
      `  Target:     ${targetDir}`;

    // Step 9: Confirm
    const confirmed = await confirmInstall(plan);
    if (!confirmed) {
      throw new UserCancelError('Install cancelled by user');
    }

    // Step 10: Clone
    await cloneRepo(`https://github.com/${repo}.git`, targetDir, sha);

    // Step 11: Verify checkout
    const head = await revParseHead(targetDir);
    if (head !== sha) {
      throw new Error(`SHA verification failed: expected ${sha}, got ${head}`);
    }

    // Step 12: Record
    await addRecord({
      repo,
      ref: ref ?? 'HEAD',
      resolvedSha: sha,
      installPath: targetDir,
      timestamp: new Date().toISOString(),
    });

    // Step 14: Log success
    process.stdout.write(`${pc.green('✓')} Installed ${pc.bold(repo)} to ${targetDir}\n`);
  } finally {
    // Step 13: Release lock (crash-safe)
    await releaseLock().catch(() => {});
  }
}
