import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { dataDir } from './data-dir.js';

export const InstallRecord = z.object({
  repo: z.string(),
  ref: z.string(),
  resolvedSha: z.string(),
  installPath: z.string(),
  timestamp: z.string(),
});

export const InstallStore = z.object({
  schemaVersion: z.literal(1),
  records: z.array(InstallRecord),
});

export type InstallRecord = z.infer<typeof InstallRecord>;
export type InstallStore = z.infer<typeof InstallStore>;

function storePath(): string {
  return path.join(dataDir(), 'installs.json');
}

export async function loadRecords(): Promise<InstallStore> {
  const filePath = storePath();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return InstallStore.parse(parsed);
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { schemaVersion: 1, records: [] };
    }
    // Return empty store on any parse/validation error too
    if (err instanceof SyntaxError || err instanceof z.ZodError) {
      return { schemaVersion: 1, records: [] };
    }
    throw err;
  }
}

async function persistStore(store: InstallStore): Promise<void> {
  const filePath = storePath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  // TODO: swap to atomicWrite from src/safety/atomicity.ts once Phase B lands
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), 'utf8');
}

export async function addRecord(record: InstallRecord): Promise<void> {
  const store = await loadRecords();
  store.records.push(record);
  await persistStore(store);
}

export async function removeRecord(repo: string): Promise<void> {
  const store = await loadRecords();
  store.records = store.records.filter((r) => r.repo !== repo);
  await persistStore(store);
}
