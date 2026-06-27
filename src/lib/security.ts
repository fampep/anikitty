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

const DEV_JWT_MARKERS = ["dev-secret", "change-in-production"];
const DEV_ADMIN_MARKERS = ["admin-dev", "change-in-production"];

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isJwtSecretSecure(): boolean {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return false;
  const lower = secret.toLowerCase();
  return !DEV_JWT_MARKERS.some((m) => lower.includes(m));
}

export function isAdminJwtSecretSecure(): boolean {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 32) return false;
  const lower = secret.toLowerCase();
  return !DEV_ADMIN_MARKERS.some((m) => lower.includes(m));
}

/** Reject auth operations when production is using default/weak secrets. */
export function assertAuthSecretsConfigured(): string | null {
  if (!isProduction()) return null;
  if (!isJwtSecretSecure()) {
    return "Server authentication is misconfigured. Set a strong JWT_SECRET (32+ chars).";
  }
  return null;
}

export function sanitizeHeaderValue(value: string | null | undefined, maxLen = 512): string {
  if (!value) return "";
  return value.replace(/[\r\n\0]/g, "").trim().slice(0, maxLen);
}

function parseIpv4(hostname: string): [number, number, number, number] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return null;
  const parts = match.slice(1).map(Number) as [number, number, number, number];
  if (parts.some((n) => n > 255)) return null;
  return parts;
}

function isPrivateOrReservedIpv4(a: number, b: number): boolean {
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true;
  return false;
}

/** Block SSRF targets: loopback, link-local, private networks, metadata endpoints. */
export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }

  if (
    host === "::1" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  const v4 = parseIpv4(host);
  if (v4) return isPrivateOrReservedIpv4(v4[0], v4[1]);

  return false;
}

export function isAllowedFetchUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (parsed.username || parsed.password) return false;
  if (isBlockedHostname(parsed.hostname)) return false;
  if (url.length > 4096) return false;

  return true;
}

export function isSafeHttpsUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (isBlockedHostname(parsed.hostname)) return false;
    if (url.length > 2048) return false;
    return true;
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
  const jwtSecret = isJwtSecretSecure();
  const adminPassword = Boolean(process.env.ADMIN_PASSWORD);
  const adminJwtSecret = isAdminJwtSecretSecure();
  const databaseUrl = Boolean(process.env.DATABASE_URL);

  const warnings: string[] = [];
  if (isProduction()) {
    if (!jwtSecret) warnings.push("Set a strong JWT_SECRET (32+ characters)");
    if (!adminPassword) warnings.push("Set ADMIN_PASSWORD");
    if (!adminJwtSecret) warnings.push("Set a strong ADMIN_JWT_SECRET (32+ characters)");
    if (!databaseUrl) warnings.push("Set DATABASE_URL");
    if (!process.env.TOTP_ENCRYPTION_KEY) {
      warnings.push("Set TOTP_ENCRYPTION_KEY (recommended separate from JWT_SECRET)");
    }
  }

  return { jwtSecret, adminPassword, adminJwtSecret, databaseUrl, warnings };
}
