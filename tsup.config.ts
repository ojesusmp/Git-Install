import { defineConfig } from 'tsup';
import { cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  dts: false,
  sourcemap: true,
  async onSuccess() {
    // Copy skill templates to dist/skills
    const src = 'src/skills';
    const dest = 'dist/skills';
    if (existsSync(src)) {
      await cp(src, dest, { recursive: true });
      console.log('Copied src/skills -> dist/skills');
      // FIX-7: remove any .gitkeep files that were copied
      const { readdir, unlink } = await import('node:fs/promises');
      async function rmGitkeep(dir: string): Promise<void> {
        let entries;
        try {
          entries = await readdir(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const ent of entries) {
          const p = `${dir}/${ent.name}`;
          if (ent.isDirectory()) {
            await rmGitkeep(p);
          } else if (ent.name === '.gitkeep') {
            await unlink(p).catch(() => {});
          }
        }
      }
      await rmGitkeep(dest).catch(() => {});
    }
  },
});
