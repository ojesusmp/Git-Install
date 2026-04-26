import pc from 'picocolors';
import { searchRepos } from '../lib/github.js';

export interface SearchOptions {
  limit?: number;
}

export async function search(query: string, opts?: SearchOptions): Promise<void> {
  const repos = await searchRepos(query, opts?.limit ?? 10);

  if (repos.length === 0) {
    process.stderr.write(
      `No repositories matched "${query}". Try different keywords or use 'owner/repo' format.\n`,
    );
    return;
  }

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const num = pc.bold(pc.cyan(`${i + 1}.`));
    const fullName = `${repo.owner}/${repo.name}`;
    const desc = repo.description ? ` - ${repo.description}` : '';
    const lang = repo.language ?? 'unknown';
    const date = repo.updatedAt.slice(0, 10);
    const meta = pc.dim(`(${lang}, ${repo.stars} stars, updated ${date})`);
    process.stdout.write(`${num} ${fullName}${desc} ${meta}\n`);
    process.stdout.write(`   URL: https://github.com/${fullName}\n`);
  }

  process.stdout.write(
    `\nReply with the number you want installed, or say "search more" with a refinement.\n`,
  );
}
