"use client";

import Link from "next/link";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import React, { useCallback, useEffect, useRef, useState } from "react";
import SearchBar from "./search-bar";
import { Coins, SearchIcon, X } from "lucide-react";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import NavbarAvatar from "./navbar-avatar";
import NotificationBell from "./notification-bell";
import { accountAuth, clearAccountToken, authFromMeResponse } from "@/lib/oauth/account";
import { hasLikelyAuthSession } from "@/lib/auth/auth-fetch";
import { usePathname } from "next/navigation";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { useKittycoins } from "@/hooks/use-kittycoins";
import SiteBrandWordmark from "@/components/layout/site-brand-wordmark";

/** Primary destinations shown inline in the pill on desktop. */
const NAV_LINKS = [
  { href: ROUTES.HOME, key: "nav.home" },
  { href: ROUTES.NEW, key: "nav.newReleases" },
  { href: ROUTES.TRENDING, key: "nav.trending" },
  { href: ROUTES.SCHEDULE, key: "nav.schedule" },
  { href: ROUTES.COMMUNITY, key: "nav.community" },
] as const;

function KittycoinPill() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const { balance, loaded } = useKittycoins(!!auth);

  if (!auth) return null;

  return (
    <Link
      href={ROUTES.SHOP}
      title={t("nav.shop")}
      className="inline-flex items-center gap-1 rounded-full border border-amber-400/15 bg-amber-500/[0.08] px-2 py-1.5 text-[11px] font-bold text-amber-200/85 tabular-nums transition-colors hover:bg-amber-500/12 sm:gap-1.5 sm:px-2.5 sm:text-[12px]"
    >
      <Coins className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden xs:inline">{loaded ? balance.toLocaleString() : "—"}</span>
    </Link>
  );
}

const NavBar = () => {
  const t = useT();
  const user = useAuthStore((s) => s.auth);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [searchOpen, setSearchOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const authBag = React.useMemo(
    () => ({ auth: user, setAuth, clearAuth }),
    [user, setAuth, clearAuth],
  );

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const meProbeRef = useRef(false);

  useEffect(() => {
    if (user) {
      meProbeRef.current = false;
      return;
    }
    if (meProbeRef.current) return;
    meProbeRef.current = true;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        // Always probe once — HttpOnly session cookies are invisible to JS.
        try {
          const me = await accountAuth.me();
          if (!cancelled) setAuth(authFromMeResponse(me));
        } catch (e: unknown) {
          const status = (e as { status?: number })?.status;
          if (!cancelled && status === 401 && hasLikelyAuthSession()) {
            clearAccountToken();
            clearAuth();
          }
        }
      })();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, setAuth, clearAuth]);

  const discordHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || discordHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const discord = params.get("discord");
    if (!discord) return;

    discordHandledRef.current = true;

    const errorKeys: Record<string, string> = {
      cancelled: "auth.discordCancelled",
      not_configured: "auth.discordNotConfigured",
      banned: "auth.discordBanned",
      email_conflict: "auth.discordEmailConflict",
      invalid_state: "auth.discordLoginFailed",
      token_exchange: "auth.discordLoginFailed",
      user_fetch: "auth.discordLoginFailed",
      server: "auth.discordLoginFailed",
    };

    if (discord === "welcome") {
      toast.success(t("auth.discordWelcome"));
      void accountAuth
        .me()
        .then((me) => setAuth(authFromMeResponse(me)))
        .catch(() => {});
    } else {
      const key = errorKeys[discord] ?? "auth.discordLoginFailed";
      toast.error(t(key));
    }

    params.delete("discord");
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", next);
  }, [setAuth, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Collapse when focus/pointer leaves the pill entirely.
  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!pillRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen]);

  // The field stays mounted, so `autoFocus` never fires — focus it explicitly.
  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.querySelector("input")?.focus();
  }, [searchOpen]);

  // Close the expanded field on navigation.
  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  if (isLanding) return null;

  return (
    <header className="site-header pointer-events-none fixed inset-x-0 top-0 z-[100] pt-safe">
      <div className="mx-auto flex w-full max-w-[87.5rem] justify-center px-3 pt-[var(--nav-float)] sm:px-5">
        <div
          ref={pillRef}
          data-search-open={searchOpen || undefined}
          className={cn(
            "site-header-pill pointer-events-auto flex w-fit max-w-full items-center",
            "gap-1 px-2.5 sm:gap-2 sm:px-3.5",
          )}
        >
          <Link
            href={ROUTES.HOME}
            className="group relative flex shrink-0 items-center rounded-md py-0.5 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <SiteBrandWordmark size="nav" />
          </Link>

          {/* Primary links — only the narrow breakpoints yield to the field. */}
          <nav
            aria-label={t("nav.menu")}
            className={cn(
              "site-header-links hidden items-center gap-0.5 md:flex",
              searchOpen && "max-lg:hidden",
            )}
          >
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "site-header-link rounded-full px-2.5 py-1.5 text-[13px] font-medium",
                    active
                      ? "bg-foreground/[0.07] text-foreground dark:bg-white/10 dark:text-white"
                      : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground dark:text-white/55 dark:hover:bg-white/[0.07] dark:hover:text-white",
                  )}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </nav>

          {/* Expanding search field — width drives the pill's own growth. */}
          <div
            ref={searchRef}
            aria-hidden={!searchOpen}
            className={cn(
              "site-header-search min-w-0 overflow-hidden",
              searchOpen ? "w-[min(60vw,22rem)] opacity-100" : "w-0 opacity-0",
            )}
          >
            <SearchBar className="w-full" onAnimeClick={closeSearch} />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              className="site-header-icon inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground dark:text-white/60 dark:hover:bg-white/[0.08] dark:hover:text-white"
              aria-label={searchOpen ? t("nav.aria.closeSearch") : t("nav.aria.openSearch")}
              aria-expanded={searchOpen}
            >
              {searchOpen ? <X className="h-4 w-4" /> : <SearchIcon className="h-4 w-4" />}
            </button>
            {user && <KittycoinPill />}
            {user && <NotificationBell />}
            {user ? <NavbarAvatar auth={authBag} /> : <LoginPopoverButton />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
