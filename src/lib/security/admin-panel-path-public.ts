/** Client-safe admin UI path checks (uses public env + /admin fallback). */
export function getPublicAdminPanelPath(): string {
  const raw = process.env.NEXT_PUBLIC_ADMIN_PANEL_PATH?.trim();
  if (raw) {
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return path.replace(/\/+$/, "") || "/admin";
  }
  return "/admin";
}

export function isPublicAdminUiPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const panel = getPublicAdminPanelPath();
  if (pathname === panel || pathname.startsWith(`${panel}/`)) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return false;
}
