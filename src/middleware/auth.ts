import type { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../lib/jwt";
import { env } from "../config/env";
import { getUserById } from "../services/userService";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string;
  githubLogin: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Read the JWT from the Authorization header, falling back to the session cookie. */
export function extractToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (typeof header === "string" && header.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token.length > 0) return token;
  }

  const cookie = request.cookies?.[env.cookieName];
  return typeof cookie === "string" && cookie.length > 0 ? cookie : null;
}

async function resolveUser(request: Request): Promise<AuthUser | null> {
  const token = extractToken(request);
  if (!token) return null;

  const payload = verifyJwt(token, env.jwtSecret);
  if (!payload) return null;

  const user = await getUserById(payload.sub);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    githubLogin: user.githubLogin
  };
}

export async function requireAuth(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveUser(request);
    if (!user) {
      response.status(401).json({ success: false, error: "Authentication required. Please sign in." });
      return;
    }

    request.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    response.status(401).json({ success: false, error: "Authentication failed. Please sign in again." });
  }
}

export async function optionalAuth(request: Request, _response: Response, next: NextFunction): Promise<void> {
  try {
    const user = await resolveUser(request);
    if (user) request.user = user;
  } catch (error) {
    console.error("Optional auth error:", error);
  }
  next();
}
