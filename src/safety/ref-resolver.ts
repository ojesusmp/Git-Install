import { execa } from 'execa';

export interface ResolvedRef {
  sha: string;
  mutable: boolean;
  warning?: string;
}

/**
 * Regex that matches 7–40 hex characters (a pinned SHA).
 * If `ref` matches this pattern it is treated as an immutable pass-through.
 */
const SHA_RE = /^[0-9a-f]{7,40}$/i;

/**
 * Resolve a GitHub repo ref to a concrete SHA.
 *
 * Resolution order:
 *   1. If `ref` already looks like a SHA (7–40 hex chars) → pass-through, mutable=false.
 *   2. Try `gh api repos/{owner}/{repo}/commits/{ref|HEAD}` (--jq .sha).
 *   3. On ENOENT (gh not on PATH) → try `git ls-remote {url} {ref|HEAD}`.
 *   4. Both failed → try `fetch` against GitHub REST API.
 *   5. All failed → throw.
 */
export async function resolveRef(repo: string, ref?: string): Promise<ResolvedRef> {
  // (b) SHA pass-through
  if (ref && SHA_RE.test(ref)) {
    return { sha: ref, mutable: false };
  }

  const effectiveRef = ref ?? 'HEAD';
  const [owner, repoName] = repo.split('/');

  // (a/c/d) Try gh api
  try {
    const { stdout } = await execa(
      'gh',
      ['api', `repos/${owner}/${repoName}/commits/${effectiveRef}`, '--jq', '.sha'],
      { all: false },
    );
    const sha = stdout.trim();
    return buildMutableResult(sha, ref);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      // gh is available but the call failed — still try fallbacks
    }
  }

  // (f) Fallback: git ls-remote
  const repoUrl = `https://github.com/${owner}/${repoName}.git`;
  try {
    const { stdout } = await execa('git', ['ls-remote', repoUrl, ref ?? 'HEAD'], { all: false });
    const firstLine = stdout.trim().split('\n')[0] ?? '';
    const sha = firstLine.split('\t')[0]?.trim() ?? '';
    if (sha && SHA_RE.test(sha)) {
      return buildMutableResult(sha, ref);
    }
  } catch {
    // fall through to fetch
  }

  // (g) Fallback: GitHub REST API via fetch
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/commits/${effectiveRef}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(
      `resolveRef: all resolution methods failed for ${repo}@${effectiveRef}. ` +
        `Last HTTP status: ${response.status}`,
    );
  }
  const data = (await response.json()) as { sha: string };
  return buildMutableResult(data.sha, ref);
}

function buildMutableResult(sha: string, ref: string | undefined): ResolvedRef {
  const isTag = ref !== undefined && !SHA_RE.test(ref);
  const warningKind = isTag
    ? ref.startsWith('v')
      ? `tag '${ref}'`
      : `branch/tag '${ref}'`
    : 'default branch';

  const warning =
    `Installing from mutable ref (${warningKind}). SHA may change. ` + `Resolved to ${sha}.`;

  return { sha, mutable: true, warning };
}
