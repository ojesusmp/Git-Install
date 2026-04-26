import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('install-record lib', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'git-install-test-'));
    vi.resetModules();
    vi.doMock('../../src/lib/data-dir.ts', () => ({
      dataDir: () => tempDir,
    }));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('loadRecords returns empty store when file does not exist', async () => {
    const { loadRecords } = await import('../../src/lib/install-record.ts');
    const store = await loadRecords();
    expect(store.schemaVersion).toBe(1);
    expect(store.records).toEqual([]);
  });

  it('addRecord adds an entry and persists schemaVersion=1', async () => {
    const { addRecord, loadRecords } = await import('../../src/lib/install-record.ts');

    const record = {
      repo: 'owner/my-tool',
      ref: 'main',
      resolvedSha: 'abc123def456',
      installPath: '/some/path/my-tool',
      timestamp: '2024-01-01T00:00:00Z',
    };

    await addRecord(record);
    const store = await loadRecords();

    expect(store.schemaVersion).toBe(1);
    expect(store.records).toHaveLength(1);
    expect(store.records[0]).toMatchObject(record);
  });

  it('addRecord persists across fresh loadRecords', async () => {
    const { addRecord, loadRecords } = await import('../../src/lib/install-record.ts');

    await addRecord({
      repo: 'owner/tool-a',
      ref: 'v1.0.0',
      resolvedSha: 'sha1111',
      installPath: '/path/tool-a',
      timestamp: '2024-01-01T00:00:00Z',
    });

    await addRecord({
      repo: 'owner/tool-b',
      ref: 'main',
      resolvedSha: 'sha2222',
      installPath: '/path/tool-b',
      timestamp: '2024-01-02T00:00:00Z',
    });

    const store = await loadRecords();
    expect(store.records).toHaveLength(2);
  });

  it('removeRecord removes by repo name', async () => {
    const { addRecord, removeRecord, loadRecords } =
      await import('../../src/lib/install-record.ts');

    await addRecord({
      repo: 'owner/tool-to-remove',
      ref: 'main',
      resolvedSha: 'sha9999',
      installPath: '/path/tool-to-remove',
      timestamp: '2024-01-01T00:00:00Z',
    });

    await removeRecord('owner/tool-to-remove');
    const store = await loadRecords();
    expect(store.records).toHaveLength(0);
  });

  it('removeRecord is a no-op when repo not found', async () => {
    const { removeRecord, loadRecords } = await import('../../src/lib/install-record.ts');
    await expect(removeRecord('nonexistent/repo')).resolves.not.toThrow();
    const store = await loadRecords();
    expect(store.records).toHaveLength(0);
  });

  it('written file contains schemaVersion: 1', async () => {
    const { addRecord } = await import('../../src/lib/install-record.ts');

    await addRecord({
      repo: 'owner/check-version',
      ref: 'main',
      resolvedSha: 'abc111',
      installPath: '/path/check-version',
      timestamp: '2024-01-01T00:00:00Z',
    });

    const raw = await fs.readFile(path.join(tempDir, 'installs.json'), 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
  });
});
