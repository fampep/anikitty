/** Routes where banner ads should never appear. */
export const AD_EXCLUDED_PATH_PREFIXES = [
  "/profile",
  "/settings",
  "/donate",
  "/admin",
  "/auth",
  "/messages",
  "/offline",
] as const;

export function isAdPlacementAllowed(pathname: string): boolean {
  if (pathname === "/") return false;
  return !AD_EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
