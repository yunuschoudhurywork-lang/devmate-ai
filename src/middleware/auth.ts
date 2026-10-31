import type { Request, Response, NextFunction } from "express";
import { WorkOS } from "@workos-inc/node";
import { getUserByWorkosId } from "../services/userService";

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const clientId = process.env.WORKOS_CLIENT_ID!;

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        workosId: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        profileImage?: string | null;
      };
    }
  }
}

/**
 * Authentication middleware
 * Validates session and attaches authenticated user to request
 */
export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get session cookie
    const sessionCookie = request.cookies?.["wos-session"];

    if (!sessionCookie) {
      response.status(401).json({
        success: false,
        error: "Authentication required. Please sign in.",
      });
      return;
    }

    // Load and authenticate session using WorkOS
    const session = workos.userManagement.loadSealedSession({
      sessionData: sessionCookie,
      cookiePassword: process.env.WORKOS_COOKIE_PASSWORD!,
    });

    const authResult = await session.authenticate();

    // Check if session is valid
    if (!authResult.authenticated) {
      response.status(401).json({
        success: false,
        error: "Invalid or expired session. Please sign in again.",
      });
      return;
    }

    // Get user from database
    const user = await getUserByWorkosId(authResult.user.id);

    if (!user) {
      response.status(401).json({
        success: false,
        error: "User not found. Please sign in again.",
      });
      return;
    }

    // Attach user to request
    request.user = {
      id: user.id,
      workosId: user.workosId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    response.status(401).json({
      success: false,
      error: "Authentication failed. Please sign in again.",
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if authenticated, but doesn't require it
 */
export async function optionalAuth(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionCookie = request.cookies?.["wos-session"];

    if (!sessionCookie) {
      next();
      return;
    }

    const session = workos.userManagement.loadSealedSession({
      sessionData: sessionCookie,
      cookiePassword: process.env.WORKOS_COOKIE_PASSWORD!,
    });

    const authResult = await session.authenticate();

    if (authResult.authenticated) {
      const user = await getUserByWorkosId(authResult.user.id);
      if (user) {
        request.user = {
          id: user.id,
          workosId: user.workosId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage,
        };
      }
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    console.error("Optional auth error:", error);
    next();
  }
}
