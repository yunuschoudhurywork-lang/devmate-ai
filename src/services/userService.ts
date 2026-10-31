import { prisma } from "../db/prisma";
import type { User } from "@prisma/client";

export interface WorkOSUserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

/**
 * Find or create a user based on WorkOS user profile
 * This synchronizes WorkOS identity with our local database
 */
export async function findOrCreateUser(workosProfile: WorkOSUserProfile): Promise<User> {
  // Try to find existing user by WorkOS ID
  let user = await prisma.user.findUnique({
    where: { workosId: workosProfile.id },
  });

  if (user) {
    // Update user info if it changed
    if (
      user.email !== workosProfile.email ||
      user.firstName !== workosProfile.firstName ||
      user.lastName !== workosProfile.lastName ||
      user.profileImage !== workosProfile.profilePictureUrl
    ) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: workosProfile.email,
          firstName: workosProfile.firstName || null,
          lastName: workosProfile.lastName || null,
          profileImage: workosProfile.profilePictureUrl || null,
        },
      });
    }
    return user;
  }

  // Create new user
  try {
    user = await prisma.user.create({
      data: {
        workosId: workosProfile.id,
        email: workosProfile.email,
        firstName: workosProfile.firstName || null,
        lastName: workosProfile.lastName || null,
        profileImage: workosProfile.profilePictureUrl || null,
      },
    });
    return user;
  } catch (error) {
    // Handle race condition: another request might have created the user
    const existingUser = await prisma.user.findUnique({
      where: { workosId: workosProfile.id },
    });
    if (existingUser) {
      return existingUser;
    }
    throw error;
  }
}

/**
 * Get user by internal ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

/**
 * Get user by WorkOS ID
 */
export async function getUserByWorkosId(workosId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { workosId: workosId },
  });
}
