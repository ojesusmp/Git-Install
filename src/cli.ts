#!/usr/bin/env node
import { readFileSync } from 'fs';
import { Command } from 'commander';
import pc from 'picocolors';
import { setup } from './commands/setup.js';
import { search } from './commands/search.js';
import { install } from './commands/install.js';
import { uninstall } from './commands/uninstall.js';
import { EXIT_GENERAL_ERROR, EXIT_MISSING_PREREQ, CLIError } from './lib/exit-codes.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

if (parseInt(process.versions.node.split('.')[0], 10) < 20) {
  process.stderr.write('Node 20+ required\n');
  process.exit(EXIT_MISSING_PREREQ);
}

const program = new Command();

program.name('git-install').version(pkg.version);

program
  .command('setup')
  .description('Install skills for Claude and/or Codex')
  .option('--claude', 'Install Claude skill')
  .option('--codex', 'Install Codex skill')
  .option('--both', 'Install both Claude and Codex skills')
  .action(async (opts: { claude?: boolean; codex?: boolean; both?: boolean }) => {
    await setup({ claude: opts.claude, codex: opts.codex, both: opts.both });
  });

const repo = program.command('repo').description('Manage repository installations');

repo
  .command('search <query>')
  .description('Search for repositories')
  .option('-l, --limit <n>', 'Maximum results to return')
  .action(async (query: string, opts: { limit?: string }) => {
    await search(query, { limit: opts.limit !== undefined ? parseInt(opts.limit, 10) : undefined });
  });

repo
  .command('install <query>')
  .description('Install a repository')
  .option('--force', 'Force install even if lock is held')
  .action(async (query: string, opts: { force?: boolean }) => {
    await install(query, { force: opts.force });
  });

repo
  .command('uninstall <name>')
  .description('Uninstall a repository')
  .option('--force', 'Force uninstall even if lock is held')
  .action(async (name: string, opts: { force?: boolean }) => {
    await uninstall(name, { force: opts.force });
  });

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err instanceof CLIError) {
    process.stderr.write(pc.red(`Error: ${err.message}\n`));
    process.exit(err.code);
  }
  process.stderr.write(
    pc.red(`Unexpected error: ${err instanceof Error ? err.message : String(err)}\n`),
  );
  process.exit(EXIT_GENERAL_ERROR);
}
