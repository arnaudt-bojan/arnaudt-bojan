import { PrismaClient } from "../generated/prisma";

/**
 * Prisma Client Singleton
 * 
 * Ensures only one Prisma Client instance is created across the application.
 * This prevents connection pool exhaustion in development with hot reloading.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Graceful shutdown handler
 * Ensures database connections are properly closed on application exit
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

// Register shutdown handlers
process.on("SIGINT", async () => {
  await disconnectPrisma();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectPrisma();
  process.exit(0);
});

export default prisma;
