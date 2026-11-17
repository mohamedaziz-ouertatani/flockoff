import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Vercel's Supabase integration names the pooled URL POSTGRES_PRISMA_URL; accept it as-is.
    datasourceUrl: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
