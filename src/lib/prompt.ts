import { input } from '@inquirer/prompts';

export function assertTTY(): void {
  if (!process.stdin.isTTY) {
    throw new Error('TTY required: this command must be run in an interactive terminal.');
  }
}

export async function confirmInstall(plan: string): Promise<boolean> {
  if (process.env.GIT_INSTALL_NONINTERACTIVE === '1') {
    console.warn('WARN: GIT_INSTALL_NONINTERACTIVE=1 — auto-confirming install.');
    return true;
  }

  console.log('\n' + plan + '\n');
  const answer = await input({ message: 'Type "confirm" to proceed:' });
  return answer === 'confirm';
}

export async function confirmUninstall(plan: string): Promise<boolean> {
  if (process.env.GIT_INSTALL_NONINTERACTIVE === '1') {
    console.warn('WARN: GIT_INSTALL_NONINTERACTIVE=1 — auto-confirming uninstall.');
    return true;
  }

  console.log('\n' + plan + '\n');
  const answer = await input({ message: 'Type "confirm uninstall" to proceed:' });
  return answer === 'confirm uninstall';
}
