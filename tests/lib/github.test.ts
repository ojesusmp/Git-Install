import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Repo } from '../../src/lib/github.ts';

// Mock execa module
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('searchRepos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed Repo[] from mocked gh search repos --json', async () => {
    const { execa } = await import('execa');
    const mockExeca = vi.mocked(execa);

    const ghOutput = JSON.stringify([
      {
        fullName: 'owner/repo-name',
        description: 'A test repo',
        stargazersCount: 42,
        language: 'TypeScript',
        url: 'https://github.com/owner/repo-name',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]);

    mockExeca.mockResolvedValueOnce({ stdout: ghOutput } as never);

    const { searchRepos } = await import('../../src/lib/github.ts');
    const results = await searchRepos('typescript cli');

    expect(results).toHaveLength(1);
    const repo = results[0];
    expect(repo.owner).toBe('owner');
    expect(repo.name).toBe('repo-name');
    expect(repo.fullName).toBe('owner/repo-name');
    expect(repo.description).toBe('A test repo');
    expect(repo.stars).toBe(42);
    expect(repo.language).toBe('TypeScript');
    expect(repo.url).toBe('https://github.com/owner/repo-name');
    expect(repo.updatedAt).toBe('2024-01-01T00:00:00Z');
  });

  it('returns [] for empty results', async () => {
    const { execa } = await import('execa');
    const mockExeca = vi.mocked(execa);
    mockExeca.mockResolvedValueOnce({ stdout: '[]' } as never);

    const { searchRepos } = await import('../../src/lib/github.ts');
    const results = await searchRepos('nonexistent-query-xyz');
    expect(results).toEqual([]);
  });

  it('falls back to GitHub REST API when gh is not found (ENOENT)', async () => {
    const { execa } = await import('execa');
    const mockExeca = vi.mocked(execa);

    const enoentError = Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
    mockExeca.mockRejectedValueOnce(enoentError);

    const apiResponse = {
      items: [
        {
          full_name: 'owner/api-repo',
          description: 'API fallback repo',
          stargazers_count: 100,
          language: 'JavaScript',
          html_url: 'https://github.com/owner/api-repo',
          updated_at: '2024-02-01T00:00:00Z',
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    } as never);

    const { searchRepos } = await import('../../src/lib/github.ts');
    const results = await searchRepos('cli tool');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.github.com/search/repositories?q='),
    );
    expect(results).toHaveLength(1);
    expect(results[0].owner).toBe('owner');
    expect(results[0].name).toBe('api-repo');
    expect(results[0].stars).toBe(100);
  });

  it('throws a clear error on network failure in fallback fetch', async () => {
    const { execa } = await import('execa');
    const mockExeca = vi.mocked(execa);

    const enoentError = Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
    mockExeca.mockRejectedValueOnce(enoentError);

    mockFetch.mockRejectedValueOnce(new Error('Network unreachable'));

    const { searchRepos } = await import('../../src/lib/github.ts');
    await expect(searchRepos('cli tool')).rejects.toThrow(/network|fetch|unreachable/i);
  });

  it('result includes all required Repo fields', async () => {
    const { execa } = await import('execa');
    const mockExeca = vi.mocked(execa);

    const ghOutput = JSON.stringify([
      {
        fullName: 'myorg/my-tool',
        description: null,
        stargazersCount: 0,
        language: null,
        url: 'https://github.com/myorg/my-tool',
        updatedAt: '2024-03-01T00:00:00Z',
      },
    ]);

    mockExeca.mockResolvedValueOnce({ stdout: ghOutput } as never);

    const { searchRepos } = await import('../../src/lib/github.ts');
    const results = await searchRepos('my-tool');

    const repo: Repo = results[0];
    // All required fields present
    expect(typeof repo.owner).toBe('string');
    expect(typeof repo.name).toBe('string');
    expect(typeof repo.fullName).toBe('string');
    expect(repo.description).toBeNull();
    expect(typeof repo.stars).toBe('number');
    expect(repo.language).toBeNull();
    expect(typeof repo.url).toBe('string');
    expect(typeof repo.updatedAt).toBe('string');
  });

  it('passes correct args to gh including limit', async () => {
    const { execa } = await import('execa');
    const mockExeca = vi.mocked(execa);
    mockExeca.mockResolvedValueOnce({ stdout: '[]' } as never);

    const { searchRepos } = await import('../../src/lib/github.ts');
    await searchRepos('my query', 5);

    expect(mockExeca).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['search', 'repos', 'my query', '--limit', '5']),
    );
  });
});
