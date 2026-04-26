import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { input } from '@inquirer/prompts';
import { recoverFromInterrupt } from '../safety/atomicity.js';
import { isProtected } from '../safety/protected-dirs.js';
import { assertTTY, confirmUninstall } from '../lib/prompt.js';
import { loadRecords, removeRecord } from '../lib/install-record.js';
import { acquireLock, releaseLock } from '../lib/lockfile.js';
import type { InstallRecord } from '../lib/install-record.js';

export interface UninstallOptions {
  force?: boolean;
}

function buildPlan(record: InstallRecord): string {
  return [
    'Uninstall plan:',
    `  Repository:    ${record.repo}`,
    `  Install path:  ${record.installPath}`,
    `  Resolved SHA:  ${record.resolvedSha}`,
    `  Installed at:  ${record.timestamp}`,
    '',
    'This will permanently delete the local clone at the path above.',
  ].join('\n');
}

async function selectFromMultiple(matches: InstallRecord[]): Promise<InstallRecord> {
  process.stdout.write('Multiple installations matched. Select one:\n');
  for (let i = 0; i < matches.length; i++) {
    process.stdout.write(`  ${i + 1}. ${matches[i].repo} (${matches[i].installPath})\n`);
  }

  const raw = await input({ message: 'Enter number:' });
  const num = parseInt(raw.trim(), 10);
  if (isNaN(num) || num < 1 || num > matches.length) {
    throw new Error(
      `Invalid selection "${raw}". Expected a number between 1 and ${matches.length}.`,
    );
  }
  return matches[num - 1];
}

export async function uninstall(name: string, opts?: UninstallOptions): Promise<void> {
  // Step 1: recover from any interrupted previous run
  // We don't know the installPath yet, so recover in the parent dirs of any known records
  // before loading — pass a directory that may contain installed repos.
  // We'll recover after loading records by iterating their install paths' parents.

  // Step 2: Acquire lock
  await acquireLock({ force: opts?.force });

  try {
    // Step 3: TTY check (unless non-interactive)
    if (process.env.GIT_INSTALL_NONINTERACTIVE !== '1') {
      assertTTY();
    }

    // Step 1 (deferred): recover from interrupts on all known install path parents
    const store = await loadRecords();

    const installDirs = new Set<string>(store.records.map((r) => path.dirname(r.installPath)));
    for (const dir of installDirs) {
      await recoverFromInterrupt(dir);
    }

    // Step 4: look up record
    const matches = store.records.filter(
      (r) =>
        r.repo === name || r.repo.split('/')[1] === name || path.basename(r.installPath) === name,
    );

    if (matches.length === 0) {
      throw new Error(`No installed repository found matching "${name}".`);
    }

    let record: InstallRecord;
    if (matches.length === 1) {
      record = matches[0];
    } else {
      record = await selectFromMultiple(matches);
    }

    // Step 5: verify install path is safe to delete
    if (isProtected(record.installPath)) {
      const err = new Error(`Refusing to remove from protected directory: ${record.installPath}`);
      (err as NodeJS.ErrnoException).code = 'EPROTECTED';
      throw err;
    }

    // Step 6: display removal plan
    const plan = buildPlan(record);

    // Step 7: confirm
    const confirmed = await confirmUninstall(plan);
    if (!confirmed) {
      throw new Error('Uninstall cancelled by user.');
    }

    // Step 8: remove files
    await fs.rm(record.installPath, { recursive: true, force: true });

    // Step 9: remove record
    await removeRecord(record.repo);

    // Step 11: log success
    process.stdout.write(`Uninstalled ${record.repo} from ${record.installPath}\n`);
  } finally {
    // Step 10: release lock
    await releaseLock();
  }
}
