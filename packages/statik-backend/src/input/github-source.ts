/**
 * GitHub input source.
 *
 * Supports public repos (no token needed) and private repos (token
 * required). When a token is present we also use it for public repos,
 * because it bumps the GitHub rate limit from 60/h to 5000/h.
 *
 * URL forms accepted:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/<branch>
 *   git@github.com:owner/repo.git
 *   owner/repo
 *
 * Tokens are read from the request body first, then from GITHUB_TOKEN.
 * They are never logged.
 */

import axios, { AxiosError } from "axios";
import { fromZipBuffer, PreparedSource } from "./local-source";

const GITHUB_URL_RE =
  /^(?:(?:https?:\/\/)?(?:www\.)?github\.com[/:]|git@github\.com:)?(?<owner>[A-Za-z0-9_.\-]+)\/(?<repo>[A-Za-z0-9_.\-]+?)(?:\.git)?(?:\/(?:tree|blob)\/(?<branch>[^/]+))?\/?$/;

const MAX_REPO_BYTES = 80 * 1024 * 1024;

export interface GitHubRef {
  owner: string;
  repo: string;
  branch: string | null;
}

export function parseGitHubUrl(url: string): GitHubRef {
  const trimmed = (url || "").trim();
  if (!trimmed) {
    throw new Error("Empty repository URL.");
  }
  const m = GITHUB_URL_RE.exec(trimmed);
  if (!m || !m.groups) {
    throw new Error(
      "Could not parse GitHub URL. Expected something like " +
        "https://github.com/owner/repo or owner/repo."
    );
  }
  return {
    owner: m.groups.owner,
    repo: m.groups.repo,
    branch: m.groups.branch ?? null,
  };
}

function pickToken(userToken?: string | null): string | null {
  if (userToken && userToken.trim()) return userToken.trim();
  const env = process.env.GITHUB_TOKEN;
  return env && env.trim() ? env.trim() : null;
}

async function downloadZip(
  ref: GitHubRef,
  branch: string,
  token: string | null
): Promise<Buffer> {
  const headers: Record<string, string> = {
    "User-Agent": "rn-arch-evaluator",
    Accept: "application/vnd.github+json",
  };

  let url: string;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/zipball/${encodeURIComponent(branch)}`;
  } else {
    url = `https://codeload.github.com/${ref.owner}/${ref.repo}/zip/refs/heads/${encodeURIComponent(branch)}`;
  }

  try {
    const response = await axios.get<ArrayBuffer>(url, {
      headers,
      responseType: "arraybuffer",
      maxContentLength: MAX_REPO_BYTES,
      maxBodyLength: MAX_REPO_BYTES,
      timeout: 60_000,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return Buffer.from(response.data);
  } catch (err) {
    const status = (err as AxiosError).response?.status;
    if (status === 404) {
      throw new NotFoundError(
        `Branch '${branch}' not found (or the repo is private and no valid token was provided).`
      );
    }
    if (status === 401) {
      throw new Error(
        "GitHub rejected the token (401). Check that it is valid and has the 'repo' scope."
      );
    }
    if (status === 403) {
      throw new Error(
        "GitHub returned 403 — rate-limited or the token lacks permission. " +
          "Provide a token with 'repo' scope."
      );
    }
    throw new Error(
      `GitHub download failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

class NotFoundError extends Error {}

/**
 * Fetch a GitHub repo and extract it to a temp directory.
 * Auto-falls-back main -> master if no branch is specified.
 */
export async function fromGitHub(
  url: string,
  opts: { token?: string | null } = {}
): Promise<PreparedSource> {
  const ref = parseGitHubUrl(url);
  const token = pickToken(opts.token);
  const branchesToTry = ref.branch ? [ref.branch] : ["main", "master"];

  let lastErr: Error | null = null;
  for (const branch of branchesToTry) {
    try {
      const zipBuf = await downloadZip(ref, branch, token);
      const source = await fromZipBuffer(zipBuf, `${ref.owner}/${ref.repo}`);
      // Override the display name to use the full owner/repo slug.
      return { ...source, rootName: `${ref.owner}/${ref.repo}` };
    } catch (err) {
      if (err instanceof NotFoundError) {
        lastErr = err;
        continue;
      }
      throw err; // auth/rate-limit errors: surface immediately
    }
  }

  throw new Error(
    `Could not download ${ref.owner}/${ref.repo} from GitHub. ` +
      (lastErr ? lastErr.message : "") +
      " If this is a private repo, pass a GitHub token."
  );
}
