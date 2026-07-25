import { createHash } from "crypto";
import { isProduction } from "@/lib/security/security";

const DEFAULT_DEV_PATH = "/admin";

function normalizePanelPath(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let path = raw.trim();
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+$/, "") || "/";
  if (path.length < 6) return null;
  if (path.includes("//") || path.includes("..")) return null;
  return path;
}

/**
 * Public URL path for the admin UI (not `/admin` in production).
 * Set `ADMIN_PANEL_PATH` (and matching `NEXT_PUBLIC_ADMIN_PANEL_PATH` for client skips).
 */
export function getAdminPanelPath(): string {
  const fromEnv = normalizePanelPath(process.env.ADMIN_PANEL_PATH);
  if (fromEnv && fromEnv !== DEFAULT_DEV_PATH) return fromEnv;

  const fromPublic = normalizePanelPath(process.env.NEXT_PUBLIC_ADMIN_PANEL_PATH);
  if (fromPublic && fromPublic !== DEFAULT_DEV_PATH) return fromPublic;

  if (!isProduction()) return DEFAULT_DEV_PATH;

  // Production without an explicit path: derive a non-/admin URL from secrets
  // so casual scanners miss the panel. Prefer setting ADMIN_PANEL_PATH explicitly.
  const seed =
    process.env.ADMIN_JWT_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.JWT_SECRET ||
    "anikitty-admin";
  const slug = createHash("sha256").update(`admin-panel:${seed}`).digest("hex").slice(0, 16);
  return `/ak-console-${slug}`;
}

export function isAdminUiPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const panel = getAdminPanelPath();
  if (pathname === panel || pathname.startsWith(`${panel}/`)) return true;
  // Internal Next rewrite target still exists on the filesystem.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return false;
}

/** Canonical internal app route (filesystem). */
export const ADMIN_INTERNAL_PATH = "/admin";
