const DEVELOPMENT_JWT_SECRET = "devmate-ai-development-only-secret";

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/** Centralised, lazily evaluated environment configuration. */
export const env = {
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },

  get port(): number {
    return Number(read("PORT")) || 3000;
  },

  get frontendUrl(): string {
    return (read("FRONTEND_URL") || "http://localhost:5173").replace(/\/+$/, "");
  },

  get apiOrigin(): string {
    return (read("API_ORIGIN") || `http://localhost:${env.port}`).replace(/\/+$/, "");
  },

  get jwtSecret(): string {
    return read("JWT_SECRET") || DEVELOPMENT_JWT_SECRET;
  },

  get hasConfiguredJwtSecret(): boolean {
    return Boolean(read("JWT_SECRET"));
  },

  get jwtTtlSeconds(): number {
    const ttl = Number(read("JWT_TTL_SECONDS"));
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 60 * 60 * 24 * 7;
  },

  get cookieName(): string {
    return read("AUTH_COOKIE_NAME") || "devmate_session";
  },

  get githubClientId(): string | undefined {
    return read("GITHUB_CLIENT_ID");
  },

  get githubClientSecret(): string | undefined {
    return read("GITHUB_CLIENT_SECRET");
  },

  get githubCallbackUrl(): string {
    return read("GITHUB_CALLBACK_URL") || `${env.apiOrigin}/auth/github/callback`;
  },

  get isGithubEnabled(): boolean {
    return Boolean(env.githubClientId && env.githubClientSecret);
  }
};

/** Warn (once, at boot) about insecure defaults instead of failing at import time. */
export function reportConfigurationWarnings(): void {
  if (!env.hasConfiguredJwtSecret) {
    console.warn("[devmate] JWT_SECRET is not set; using an insecure development secret.");
  }
}
