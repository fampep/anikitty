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
