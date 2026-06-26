import { timingSafeEqual } from "crypto";

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function isSafeHttpsUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export type SecurityConfigStatus = {
  jwtSecret: boolean;
  adminPassword: boolean;
  adminJwtSecret: boolean;
  databaseUrl: boolean;
  warnings: string[];
};

export function getSecurityConfigStatus(): SecurityConfigStatus {
  const jwtSecret = Boolean(
    process.env.JWT_SECRET && !process.env.JWT_SECRET.includes("dev-secret"),
  );
  const adminPassword = Boolean(process.env.ADMIN_PASSWORD);
  const adminJwtSecret = Boolean(
    process.env.ADMIN_JWT_SECRET && !process.env.ADMIN_JWT_SECRET.includes("admin-dev"),
  );
  const databaseUrl = Boolean(process.env.DATABASE_URL);

  const warnings: string[] = [];
  if (process.env.NODE_ENV === "production") {
    if (!jwtSecret) warnings.push("Set a strong JWT_SECRET");
    if (!adminPassword) warnings.push("Set ADMIN_PASSWORD");
    if (!adminJwtSecret) warnings.push("Set a strong ADMIN_JWT_SECRET");
    if (!databaseUrl) warnings.push("Set DATABASE_URL");
  }

  return { jwtSecret, adminPassword, adminJwtSecret, databaseUrl, warnings };
}
