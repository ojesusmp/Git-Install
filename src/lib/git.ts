import { execa } from 'execa';

const SAFE_GIT_FLAGS = ['-c', 'core.hooksPath=/dev/null'];

export async function cloneRepo(url: string, targetDir: string, ref?: string): Promise<void> {
  try {
    await execa('git', [...SAFE_GIT_FLAGS, 'clone', url, targetDir]);
  } catch (err) {
    throw new Error(
      `git clone failed for "${url}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (ref !== undefined) {
    await checkoutRef(targetDir, ref);
  }
}

export async function checkoutRef(dir: string, sha: string): Promise<void> {
  try {
    await execa('git', [...SAFE_GIT_FLAGS, '-C', dir, 'checkout', sha]);
  } catch (err) {
    throw new Error(
      `git checkout failed for SHA "${sha}" in "${dir}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function revParseHead(dir: string): Promise<string> {
  try {
    const result = await execa('git', [...SAFE_GIT_FLAGS, '-C', dir, 'rev-parse', 'HEAD']);
    return result.stdout.trim();
  } catch (err) {
    throw new Error(
      `git rev-parse HEAD failed in "${dir}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
