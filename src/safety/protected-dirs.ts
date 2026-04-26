import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Protected directories that the CLI must never write into.
 * Paths prefixed with `~` are expanded to os.homedir() at compare time.
 * Paths without `~` are treated as relative to cwd (e.g. `.omc`, `.omx`).
 */
export const PROTECTED_DIRS: readonly string[] = [
  '~/.codex',
  '~/.claude',
  '.omx',
  '.omc',
  '~/.ssh',
  '~/.gnupg',
  '~/.aws',
  '~/.config/gh',
  '~/.netrc',
] as const;

/**
 * File patterns that are always protected regardless of directory.
 * Matches the `*.env` glob: any file whose name ends with `.env`.
 */
export const PROTECTED_FILE_PATTERNS: readonly RegExp[] = [
  /(?:^|[\\/])\.env$/, // exact .env
  /\.env$/, // anything ending in .env (e.g. production.env)
] as const;

/**
 * Expand `~` prefix to os.homedir().
 * Paths without `~` prefix: if they are relative, resolve against cwd.
 */
function expandPath(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return path.resolve(os.homedir(), p.slice(p === '~' ? 1 : 2));
  }
  // Relative paths like `.omc` / `.omx` — resolve against cwd
  return path.resolve(p);
}

/**
 * Determine whether `targetPath` is inside (or equal to) any protected directory,
 * or matches any protected file pattern.
 *
 * - Resolves `targetPath` to an absolute path via `path.resolve()`.
 * - On Windows (`process.platform === 'win32'`), comparison is case-insensitive.
 * - Checks basename against `PROTECTED_FILE_PATTERNS`.
 */
export function isProtected(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const isWindows = process.platform === 'win32';

  // Normalise for comparison
  const normalise = (p: string) => (isWindows ? p.toLowerCase() : p);
  const normResolved = normalise(resolved);

  // Check against each protected directory
  for (const dir of PROTECTED_DIRS) {
    const expandedDir = expandPath(dir);
    const normDir = normalise(expandedDir);

    // Target is inside or equal to the protected dir
    // Use sep-terminated prefix to avoid partial matches (e.g. ~/.claudeXYZ)
    const prefix = normDir.endsWith(path.sep) ? normDir : normDir + path.sep;
    if (normResolved === normDir || normResolved.startsWith(prefix)) {
      return true;
    }
  }

  // Check file patterns against basename
  const basename = path.basename(resolved);
  for (const pattern of PROTECTED_FILE_PATTERNS) {
    if (pattern.test(basename)) {
      return true;
    }
  }

  return false;
}
