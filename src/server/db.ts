import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@generated/prisma/client";
import { softDeleteExtension } from "@/lib/soft-delete";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  pool.on('error', (err) => {
    console.error('[db] Idle connection error:', err.message);
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter }).$extends(softDeleteExtension) as unknown as PrismaClient;
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
