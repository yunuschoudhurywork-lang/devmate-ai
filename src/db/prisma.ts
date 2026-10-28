import { PrismaClient } from "@prisma/client";

// Singleton Prisma client instance
// In development, this prevents creating multiple instances during hot reloading
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

/** Gracefully disconnect from database */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

/** Test database connection */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
