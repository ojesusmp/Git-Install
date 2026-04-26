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
    }
  },
});
