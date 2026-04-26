import os from 'os';
import path from 'path';

export function dataDir(): string {
  const platform = process.platform;

  if (platform === 'linux') {
    const xdg = process.env.XDG_DATA_HOME;
    const base = xdg ?? path.join(os.homedir(), '.local', 'share');
    return path.join(base, 'git-install');
  }

  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'git-install');
  }

  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    const base = localAppData ?? os.homedir();
    return path.join(base, 'git-install');
  }

  // Fallback for unknown platforms
  return path.join(os.homedir(), '.git-install');
}
