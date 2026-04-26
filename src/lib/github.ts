import { execa } from 'execa';

export interface Repo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  url: string;
  updatedAt: string;
}

interface GhRepoResult {
  fullName: string;
  description: string | null;
  stargazersCount: number;
  language: string | null;
  url: string;
  updatedAt: string;
}

interface GitHubApiItem {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  updated_at: string;
}

interface GitHubApiResponse {
  items: GitHubApiItem[];
}

function parseFullName(fullName: string): { owner: string; name: string } {
  const slash = fullName.indexOf('/');
  if (slash === -1) {
    return { owner: '', name: fullName };
  }
  return { owner: fullName.slice(0, slash), name: fullName.slice(slash + 1) };
}

function mapGhResult(item: GhRepoResult): Repo {
  const { owner, name } = parseFullName(item.fullName);
  return {
    owner,
    name,
    fullName: item.fullName,
    description: item.description ?? null,
    stars: item.stargazersCount,
    language: item.language ?? null,
    url: item.url,
    updatedAt: item.updatedAt,
  };
}

async function searchViaApi(query: string, limit: number): Promise<Repo[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(
      `Network error fetching GitHub search API: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status} for query "${query}"`);
  }
  const data = (await response.json()) as GitHubApiResponse;
  return (data.items ?? []).map((item) => {
    const { owner, name } = parseFullName(item.full_name);
    return {
      owner,
      name,
      fullName: item.full_name,
      description: item.description ?? null,
      stars: item.stargazers_count,
      language: item.language ?? null,
      url: item.html_url,
      updatedAt: item.updated_at,
    };
  });
}

export async function searchRepos(query: string, limit?: number): Promise<Repo[]> {
  const effectiveLimit = limit ?? 10;

  try {
    const result = await execa('gh', [
      'search',
      'repos',
      query,
      '--json',
      'fullName,description,stargazersCount,language,url,updatedAt',
      '--limit',
      String(effectiveLimit),
    ]);
    const items = JSON.parse(result.stdout) as GhRepoResult[];
    return items.map(mapGhResult);
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return searchViaApi(query, effectiveLimit);
    }
    throw err;
  }
}
