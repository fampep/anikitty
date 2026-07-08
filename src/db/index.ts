import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Singleton pool — avoids exhausting connections during Next.js hot reload in dev
const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle> | undefined;
};

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForDb.db) {
    const client = postgres(process.env.DATABASE_URL, {
      ssl: process.env.DATABASE_URL.includes("sslmode=require") ||
           process.env.DATABASE_URL.includes("neon.tech")
        ? "require"
        : false,
      max: 10,
    });
    globalForDb.db = drizzle(client, { schema });
  }
  return globalForDb.db;
}

/**
 * Normalize a `db.execute()` result into a rows array. Depending on the
 * drizzle/driver version, raw execute returns either a bare array or a
 * `{ rows: [...] }` object — treating the object as an array silently yields
 * `undefined` rows (e.g. all-zero admin stats). This handles both.
 */
export function rowsOf<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}
