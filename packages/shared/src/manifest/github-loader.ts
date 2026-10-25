/**
 * GitHub Manifest Loader
 * Fetches app.manifest.json from GitHub repositories
 */

export interface AppManifest {
  name: string;
  title: string;
  version: string;
  category: 'core' | 'operational' | 'analytical';
  description?: string;
  icon_url?: string;
  repository?: string;
  depends?: string[];
  provides?: string[];
  config?: Record<string, unknown>;
}

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

/**
 * Parse GitHub URL to extract owner, repo, branch, path
 * Supports:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/main/path/to/app
 *   git@github.com:owner/repo.git
 */
export function parseGitHubUrl(url: string): GitHubRepoConfig | null {
  try {
    // HTTPS URL
    const httpsMatch = url.match(
      /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)\/(.+))?/
    );
    if (httpsMatch) {
      return {
        owner: httpsMatch[1],
        repo: httpsMatch[2].replace('.git', ''),
        branch: httpsMatch[3] || 'main',
        path: httpsMatch[4] || '',
      };
    }

    // SSH URL
    const sshMatch = url.match(/^git@github\.com:([^\/]+)\/([^\.]+)\.git$/);
    if (sshMatch) {
      return {
        owner: sshMatch[1],
        repo: sshMatch[2],
        branch: 'main',
        path: '',
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch app.manifest.json from GitHub raw content API
 * Requires GITHUB_TOKEN env var for higher rate limits
 */
export async function fetchManifestFromGitHub(
  repoConfig: GitHubRepoConfig,
  githubToken?: string
): Promise<AppManifest | null> {
  try {
    const manifestPath = repoConfig.path
      ? `${repoConfig.path}/app.manifest.json`
      : 'app.manifest.json';

    const url = `https://raw.githubusercontent.com/${repoConfig.owner}/${repoConfig.repo}/${repoConfig.branch}/${manifestPath}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3.raw',
    };

    if (githubToken) {
      headers.Authorization = `token ${githubToken}`;
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.warn(`❌ Failed to fetch manifest from ${url}: ${response.status}`);
      return null;
    }

    const manifest = await response.json() as AppManifest;

    // Basic validation
    if (!manifest.name || !manifest.title || !manifest.version) {
      console.warn(`❌ Invalid manifest from ${url}: missing required fields`);
      return null;
    }

    return manifest;
  } catch (error) {
    console.error(`❌ Error fetching manifest from GitHub:`, error);
    return null;
  }
}

/**
 * Fetch manifest from GitHub URL
 * Handles parsing and fetching in one call
 */
export async function fetchManifestFromGitHubUrl(
  url: string,
  githubToken?: string
): Promise<AppManifest | null> {
  const config = parseGitHubUrl(url);
  if (!config) {
    console.warn(`❌ Invalid GitHub URL: ${url}`);
    return null;
  }

  return fetchManifestFromGitHub(config, githubToken);
}

/**
 * Enrich app data from GitHub manifest
 * Merges database app record with GitHub manifest data
 */
export function enrichAppWithManifest(
  app: Record<string, unknown>,
  manifest: AppManifest
): Record<string, unknown> {
  return {
    ...app,
    // Override with manifest data (manifest is source of truth)
    title: manifest.title,
    version: manifest.version,
    category: manifest.category,
    description: manifest.description || app.description,
    icon_url: manifest.icon_url || app.icon_url,
    provides: manifest.provides || app.provides,
    depends: manifest.depends || app.depends,
    config: manifest.config || app.config,
  };
}
