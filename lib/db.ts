import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient singleton for Next.js dev (avoids exhausting
 * database connections on hot reload). Phase 1: connection
 * foundation only — no business logic queries yet.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
