import type { User } from "@prisma/client";
import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../lib/password";

export class EmailInUseError extends Error {}
export class InvalidCredentialsError extends Error {}
export class AccountLinkError extends Error {}

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string;
  githubLogin: string | null;
  createdAt: Date;
  hasPassword: boolean;
}

export interface GithubProfile {
  id: string;
  login: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    githubLogin: user.githubLogin,
    createdAt: user.createdAt,
    hasPassword: Boolean(user.passwordHash)
  };
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createLocalUser(input: { email: string; password: string; name?: string }): Promise<User> {
  const email = normaliseEmail(input.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new EmailInUseError("An account with this email already exists.");

  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name?.trim() || null,
      provider: "local"
    }
  });
}

export async function authenticateWithPassword(email: string, password: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: normaliseEmail(email) } });

  // Always run a verification to keep timing roughly consistent for unknown accounts.
  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !valid) throw new InvalidCredentialsError("Invalid email or password.");

  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email: normaliseEmail(email) } });
}

export async function updateUserProfile(
  userId: string,
  input: { name?: string | null; avatarUrl?: string | null }
): Promise<User> {
  const data: { name?: string | null; avatarUrl?: string | null } = {};
  if (input.name !== undefined) data.name = input.name?.trim() || null;
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl?.trim() || null;

  return prisma.user.update({ where: { id: userId }, data });
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new InvalidCredentialsError("Account not found.");

  if (user.passwordHash) {
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new InvalidCredentialsError("Current password is incorrect.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(nextPassword) }
  });
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

/** Create or update the local record for a GitHub identity, linking by email when possible. */
export async function upsertGithubUser(profile: GithubProfile): Promise<User> {
  const email = profile.email ? normaliseEmail(profile.email) : `${profile.login}@users.noreply.github.com`;

  const existingByGithub = await prisma.user.findUnique({ where: { githubId: profile.id } });
  if (existingByGithub) {
    return prisma.user.update({
      where: { id: existingByGithub.id },
      data: {
        email,
        name: profile.name ?? existingByGithub.name,
        avatarUrl: profile.avatarUrl ?? existingByGithub.avatarUrl,
        githubLogin: profile.login
      }
    });
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    // Link the GitHub identity to the existing account instead of duplicating it.
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        githubId: profile.id,
        githubLogin: profile.login,
        name: existingByEmail.name ?? profile.name ?? null,
        avatarUrl: existingByEmail.avatarUrl ?? profile.avatarUrl ?? null,
        provider: existingByEmail.passwordHash ? existingByEmail.provider : "github"
      }
    });
  }

  return prisma.user.create({
    data: {
      email,
      name: profile.name || profile.login,
      avatarUrl: profile.avatarUrl ?? null,
      provider: "github",
      githubId: profile.id,
      githubLogin: profile.login
    }
  });
}
