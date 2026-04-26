import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repo } from '../../src/lib/github.ts';

vi.mock('../../src/lib/github.js', () => ({
  searchRepos: vi.fn(),
}));

const mockRepos: Repo[] = [
  {
    owner: 'alice',
    name: 'cool-tool',
    fullName: 'alice/cool-tool',
    description: 'A cool CLI tool',
    stars: 123,
    language: 'TypeScript',
    url: 'https://github.com/alice/cool-tool',
    updatedAt: '2024-03-15T00:00:00Z',
  },
  {
    owner: 'bob',
    name: 'my-lib',
    fullName: 'bob/my-lib',
    description: 'Useful library',
    stars: 456,
    language: 'JavaScript',
    url: 'https://github.com/bob/my-lib',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    owner: 'carol',
    name: 'no-desc',
    fullName: 'carol/no-desc',
    description: null,
    stars: 7,
    language: null,
    url: 'https://github.com/carol/no-desc',
    updatedAt: '2023-12-31T00:00:00Z',
  },
];

describe('search command', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  it('(a) successful search: 3 repos appear with correct numbering', async () => {
    const { searchRepos } = await import('../../src/lib/github.js');
    vi.mocked(searchRepos).mockResolvedValueOnce(mockRepos);

    const { search } = await import('../../src/commands/search.ts');
    await search('cool tool');

    const allOut = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(allOut).toContain('1.');
    expect(allOut).toContain('2.');
    expect(allOut).toContain('3.');
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('(b) empty results → stderr message about no matches', async () => {
    const { searchRepos } = await import('../../src/lib/github.js');
    vi.mocked(searchRepos).mockResolvedValueOnce([]);

    const { search } = await import('../../src/commands/search.ts');
    await search('xyzzy-nonexistent-42');

    expect(stdoutSpy).not.toHaveBeenCalled();
    const errOut = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(errOut).toContain('No repositories matched');
    expect(errOut).toContain('xyzzy-nonexistent-42');
  });

  it('(c) network error from searchRepos propagates', async () => {
    const { searchRepos } = await import('../../src/lib/github.js');
    vi.mocked(searchRepos).mockRejectedValueOnce(new Error('Network error: connection refused'));

    const { search } = await import('../../src/commands/search.ts');
    await expect(search('fail query')).rejects.toThrow(/network|connection/i);
  });

  it('(d) limit option: search("foo", { limit: 5 }) calls searchRepos("foo", 5)', async () => {
    const { searchRepos } = await import('../../src/lib/github.js');
    vi.mocked(searchRepos).mockResolvedValueOnce([]);

    const { search } = await import('../../src/commands/search.ts');
    await search('foo', { limit: 5 });

    expect(searchRepos).toHaveBeenCalledWith('foo', 5);
  });

  it('(e) output formatting: contains owner/repo, description, language, stars, URL', async () => {
    const { searchRepos } = await import('../../src/lib/github.js');
    vi.mocked(searchRepos).mockResolvedValueOnce([mockRepos[0]]);

    const { search } = await import('../../src/commands/search.ts');
    await search('cool tool');

    const allOut = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(allOut).toContain('alice/cool-tool');
    expect(allOut).toContain('A cool CLI tool');
    expect(allOut).toContain('TypeScript');
    expect(allOut).toContain('123');
    expect(allOut).toContain('https://github.com/alice/cool-tool');
  });

  it('default limit is 10 when no limit option provided', async () => {
    const { searchRepos } = await import('../../src/lib/github.js');
    vi.mocked(searchRepos).mockResolvedValueOnce([]);

    const { search } = await import('../../src/commands/search.ts');
    await search('something');

    expect(searchRepos).toHaveBeenCalledWith('something', 10);
  });

  it('prints reply prompt after results', async () => {
    const { searchRepos } = await import('../../src/lib/github.js');
    vi.mocked(searchRepos).mockResolvedValueOnce([mockRepos[0]]);

    const { search } = await import('../../src/commands/search.ts');
    await search('cool');

    const allOut = stdoutSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(allOut).toContain('Reply with the number you want installed');
    expect(allOut).toContain('search more');
  });
});
