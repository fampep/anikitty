import { DONATOR_ROLE } from "@/lib/social/donation-config";

/**
 * Pure supporter-status helpers, safe to import from client components.
 *
 * These live apart from `supporter-access` because that module reaches for the
 * database (drizzle, db/schema, kittycoins). Importing it from a client
 * component drags that whole server graph into the browser bundle, which fails
 * at runtime inside webpack's module factory.
 */
export function parseSupporterUntil(value?: Date | string | null): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function hasActiveDonatorStatus(
  role?: string | null,
  supporterUntil?: Date | string | null,
): boolean {
  if (role !== DONATOR_ROLE) return false;
  const until = parseSupporterUntil(supporterUntil);
  if (!until) return true;
  return until.getTime() > Date.now();
}
