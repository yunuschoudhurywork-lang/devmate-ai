import { env } from "../config/env";
import type { GithubProfile } from "./userService";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const API_URL = "https://api.github.com";

export class GithubNotConfiguredError extends Error {}
export class GithubOAuthError extends Error {}

export function isGithubConfigured(): boolean {
  return env.isGithubEnabled;
}

export function buildAuthorizeUrl(state: string): string {
  if (!env.githubClientId) throw new GithubNotConfiguredError("GitHub OAuth is not configured.");
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", env.githubClientId);
  url.searchParams.set("redirect_uri", env.githubCallbackUrl);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  if (!env.githubClientId || !env.githubClientSecret) {
    throw new GithubNotConfiguredError("GitHub OAuth is not configured.");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: env.githubClientId,
      client_secret: env.githubClientSecret,
      code,
      redirect_uri: env.githubCallbackUrl
    })
  });

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; error?: string; error_description?: string }
    | null;

  if (!response.ok || !payload?.access_token) {
    throw new GithubOAuthError(payload?.error_description || payload?.error || "GitHub did not return an access token.");
  }

  return payload.access_token;
}

async function githubFetch<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "devmate-ai"
    }
  });

  if (!response.ok) {
    throw new GithubOAuthError(`GitHub API request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

export async function fetchGithubProfile(accessToken: string): Promise<GithubProfile> {
  const user = await githubFetch<{
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  }>(accessToken, "/user");

  let email = user.email;

  if (!email) {
    // The public profile hides the email unless it is explicitly public.
    const emails = await githubFetch<Array<{ email: string; primary: boolean; verified: boolean }>>(
      accessToken,
      "/user/emails"
    ).catch(() => []);
    email = emails.find((entry) => entry.primary && entry.verified)?.email ?? emails[0]?.email ?? null;
  }

  return {
    id: String(user.id),
    login: user.login,
    name: user.name,
    email,
    avatarUrl: user.avatar_url
  };
}
