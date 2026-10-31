import type { Request, Response } from "express";
import { WorkOS } from "@workos-inc/node";
import { findOrCreateUser } from "../services/userService";

// Validate required environment variables
const requiredEnvVars = [
  "WORKOS_API_KEY",
  "WORKOS_CLIENT_ID",
  "WORKOS_REDIRECT_URI",
  "WORKOS_COOKIE_PASSWORD",
  "FRONTEND_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const clientId = process.env.WORKOS_CLIENT_ID!;
const redirectUri = process.env.WORKOS_REDIRECT_URI!;
const cookiePassword = process.env.WORKOS_COOKIE_PASSWORD!;
const frontendUrl = process.env.FRONTEND_URL!;

/**
 * GET /auth/login
 * Initiate WorkOS authentication
 */
export async function login(request: Request, response: Response): Promise<void> {
  try {
    // Get authorization URL from WorkOS
    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      provider: "authkit",
      clientId,
      redirectUri,
    });

    // Redirect to WorkOS hosted authentication
    response.redirect(authorizationUrl);
  } catch (error) {
    console.error("Login initiation error:", error);
    response.status(500).json({
      success: false,
      error: "Failed to initiate authentication.",
    });
  }
}

/**
 * GET /auth/callback
 * Handle WorkOS authentication callback
 */
export async function callback(request: Request, response: Response): Promise<void> {
  try {
    const { code } = request.query;

    if (!code || typeof code !== "string") {
      response.redirect(`${frontendUrl}?error=missing_code`);
      return;
    }

    // Exchange authorization code for user and sealed session
    const authenticateResponse = await workos.userManagement.authenticateWithCode({
      clientId,
      code,
      session: {
        sealSession: true,
        cookiePassword,
      },
    });

    const { user, sealedSession } = authenticateResponse;

    if (!user) {
      response.redirect(`${frontendUrl}?error=no_user`);
      return;
    }

    // Find or create user in database
    await findOrCreateUser({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePictureUrl: user.profilePictureUrl,
    });

    // Set secure session cookie
    response.cookie("wos-session", sealedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Redirect back to frontend
    response.redirect(frontendUrl);
  } catch (error) {
    console.error("Authentication callback error:", error);
    response.redirect(`${frontendUrl}?error=auth_failed`);
  }
}

/**
 * POST /auth/logout
 * Terminate user session
 */
export async function logout(request: Request, response: Response): Promise<void> {
  try {
    // Clear session cookie
    response.clearCookie("wos-session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    response.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    response.status(500).json({
      success: false,
      error: "Failed to log out.",
    });
  }
}

/**
 * GET /auth/me
 * Get current authenticated user profile
 */
export async function getCurrentUser(request: Request, response: Response): Promise<void> {
  // User is already attached by requireAuth middleware
  const user = request.user;

  if (!user) {
    response.status(401).json({
      success: false,
      error: "Not authenticated.",
    });
    return;
  }

  response.status(200).json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage,
    },
  });
}
