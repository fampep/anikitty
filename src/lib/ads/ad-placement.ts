import { isPublicAdminUiPath } from "@/lib/security/admin-panel-path-public";

/** Routes where Monetag click ads should never run. */
export const AD_EXCLUDED_PATH_PREFIXES = [
  "/profile",
  "/settings",
  "/donate",
  "/admin",
  "/auth",
  "/messages",
  "/offline",
  "/status",
] as const;

export function isAdPlacementAllowed(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/") return false;
  if (pathname === "/anime/watch" || pathname.startsWith("/anime/watch/")) return false;
  if (isPublicAdminUiPath(pathname)) return false;
  return !AD_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
