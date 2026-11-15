import type { Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { env } from "../config/env";
import { signJwt } from "../lib/jwt";
import {
  EmailInUseError,
  InvalidCredentialsError,
  authenticateWithPassword,
  changePassword,
  createLocalUser,
  deleteUserAccount,
  toPublicUser,
  updateUserProfile,
  upsertGithubUser
} from "../services/userService";
import {
  GithubNotConfiguredError,
  GithubOAuthError,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchGithubProfile,
  isGithubConfigured
} from "../services/githubService";
import type { User } from "@prisma/client";
import { describeAiConfiguration } from "../services/llm";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_NAME_LENGTH = 120;
const OAUTH_STATE_COOKIE = "devmate_oauth_state";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/"
  };
}

/** Issue a JWT session and mirror it into an http-only cookie. */
function issueSession(response: Response, user: User): string {
  const token = signJwt({ sub: user.id, email: user.email }, env.jwtSecret, env.jwtTtlSeconds);

  response.cookie(env.cookieName, token, {
    ...cookieOptions(),
    maxAge: env.jwtTtlSeconds * 1000
  });

  return token;
}

function validateEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) && email.length <= 254 ? email : null;
}

function validatePassword(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH ? value : null;
}

/** POST /auth/signup */
export async function signup(request: Request, response: Response): Promise<void> {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const email = validateEmail(body.email);
  const password = validatePassword(body.password);

  if (!email) {
    response.status(400).json({ success: false, error: "A valid email address is required." });
    return;
  }
  if (!password) {
    response.status(400).json({
      success: false,
      error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
    });
    return;
  }
  if (body.name !== undefined && (typeof body.name !== "string" || body.name.length > MAX_NAME_LENGTH)) {
    response.status(400).json({ success: false, error: `'name' must be a string up to ${MAX_NAME_LENGTH} characters.` });
    return;
  }

  try {
    const user = await createLocalUser({ email, password, name: typeof body.name === "string" ? body.name : undefined });
    const token = issueSession(response, user);

    response.status(201).json({ success: true, user: toPublicUser(user), token });
  } catch (error) {
    if (error instanceof EmailInUseError) {
      response.status(409).json({ success: false, error: error.message });
      return;
    }
    console.error("Signup error:", error);
    response.status(500).json({ success: false, error: "Unable to create the account." });
  }
}

/** POST /auth/login */
export async function login(request: Request, response: Response): Promise<void> {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const email = validateEmail(body.email);
  const password = typeof body.password === "string" ? body.password : null;

  if (!email || !password) {
    response.status(400).json({ success: false, error: "Email and password are required." });
    return;
  }

  try {
    const user = await authenticateWithPassword(email, password);
    const token = issueSession(response, user);

    response.status(200).json({ success: true, user: toPublicUser(user), token });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      response.status(401).json({ success: false, error: error.message });
      return;
    }
    console.error("Login error:", error);
    response.status(500).json({ success: false, error: "Unable to sign in." });
  }
}

/** POST /auth/logout */
export async function logout(_request: Request, response: Response): Promise<void> {
  response.clearCookie(env.cookieName, cookieOptions());
  response.status(200).json({ success: true, message: "Logged out successfully." });
}

/** GET /auth/me */
export async function getCurrentUser(request: Request, response: Response): Promise<void> {
  const user = request.user;

  if (!user) {
    response.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  response.status(200).json({ success: true, user });
}

/** PATCH /auth/me */
export async function updateCurrentUser(request: Request, response: Response): Promise<void> {
  const user = request.user;
  if (!user) {
    response.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  const body = (request.body ?? {}) as Record<string, unknown>;
  if (body.name !== undefined && (typeof body.name !== "string" || body.name.length > MAX_NAME_LENGTH)) {
    response.status(400).json({ success: false, error: `'name' must be a string up to ${MAX_NAME_LENGTH} characters.` });
    return;
  }
  if (body.avatarUrl !== undefined && body.avatarUrl !== null) {
    if (typeof body.avatarUrl !== "string" || body.avatarUrl.length > 2048) {
      response.status(400).json({ success: false, error: "'avatarUrl' must be a URL string." });
      return;
    }
    if (body.avatarUrl.trim().length > 0 && !/^https?:\/\//i.test(body.avatarUrl)) {
      response.status(400).json({ success: false, error: "'avatarUrl' must start with http:// or https://." });
      return;
    }
  }

  try {
    const updated = await updateUserProfile(user.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      avatarUrl: typeof body.avatarUrl === "string" ? body.avatarUrl : undefined
    });

    const publicUser = toPublicUser(updated);
    response.status(200).json({
      success: true,
      user: {
        id: publicUser.id,
        email: publicUser.email,
        name: publicUser.name,
        avatarUrl: publicUser.avatarUrl,
        provider: publicUser.provider,
        githubLogin: publicUser.githubLogin
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    response.status(500).json({ success: false, error: "Unable to update the profile." });
  }
}

/** POST /auth/password */
export async function updatePassword(request: Request, response: Response): Promise<void> {
  const user = request.user;
  if (!user) {
    response.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  const body = (request.body ?? {}) as Record<string, unknown>;
  const nextPassword = validatePassword(body.newPassword);
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";

  if (!nextPassword) {
    response.status(400).json({
      success: false,
      error: `New password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`
    });
    return;
  }

  try {
    await changePassword(user.id, currentPassword, nextPassword);
    response.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      response.status(400).json({ success: false, error: error.message });
      return;
    }
    console.error("Change password error:", error);
    response.status(500).json({ success: false, error: "Unable to update the password." });
  }
}

/** DELETE /auth/me */
export async function deleteAccount(request: Request, response: Response): Promise<void> {
  const user = request.user;
  if (!user) {
    response.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  try {
    await deleteUserAccount(user.id);
    response.clearCookie(env.cookieName, cookieOptions());
    response.status(200).json({ success: true, message: "Account deleted." });
  } catch (error) {
    console.error("Delete account error:", error);
    response.status(500).json({ success: false, error: "Unable to delete the account." });
  }
}

/** GET /auth/config - public capabilities for the frontend */
export async function getAuthConfig(_request: Request, response: Response): Promise<void> {
  response.status(200).json({
    success: true,
    passwordAuth: true,
    githubEnabled: isGithubConfigured(),
    ai: describeAiConfiguration()
  });
}

/** GET /auth/github */
export async function githubStart(_request: Request, response: Response): Promise<void> {
  if (!isGithubConfigured()) {
    response.status(503).json({ success: false, error: "GitHub sign-in is not configured on this server." });
    return;
  }

  const state = randomBytes(16).toString("hex");

  response.cookie(OAUTH_STATE_COOKIE, state, {
    ...cookieOptions(),
    maxAge: 10 * 60 * 1000
  });

  try {
    response.redirect(buildAuthorizeUrl(state));
  } catch (error) {
    if (error instanceof GithubNotConfiguredError) {
      response.status(503).json({ success: false, error: error.message });
      return;
    }
    response.status(500).json({ success: false, error: "Unable to start GitHub sign-in." });
  }
}

/** GET /auth/github/callback */
export async function githubCallback(request: Request, response: Response): Promise<void> {
  const { code, state } = request.query;
  const expectedState = request.cookies?.[OAUTH_STATE_COOKIE];

  response.clearCookie(OAUTH_STATE_COOKIE, cookieOptions());

  if (typeof code !== "string" || code.length === 0) {
    response.redirect(`${env.frontendUrl}/?error=missing_code`);
    return;
  }

  if (typeof state !== "string" || typeof expectedState !== "string" || state !== expectedState) {
    response.redirect(`${env.frontendUrl}/?error=invalid_state`);
    return;
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const profile = await fetchGithubProfile(accessToken);
    const user = await upsertGithubUser(profile);

    issueSession(response, user);
    response.redirect(`${env.frontendUrl}/?auth=success`);
  } catch (error) {
    console.error("GitHub callback error:", error);
    const reason = error instanceof GithubNotConfiguredError ? "github_not_configured" : "auth_failed";
    response.redirect(`${env.frontendUrl}/?error=${reason}`);
  }
}

export { GithubOAuthError };
