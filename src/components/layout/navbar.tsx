"use client";

import Link from "next/link";
import { cn } from "@/lib/core/utils";
import Container from "./container";
import { ROUTES } from "@/constants/routes";
import React, { useEffect, useRef, useState } from "react";
import SearchBar from "./search-bar";
import { Coins, SearchIcon, X } from "lucide-react";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import NavbarAvatar from "./navbar-avatar";
import NotificationBell from "./notification-bell";
import { anisurgeAuth, clearAnisurgeToken, authFromMeResponse } from "@/lib/oauth/anisurge";
import { hasLikelyAuthSession } from "@/lib/auth/auth-fetch";
import { usePathname } from "next/navigation";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";
import { useKittycoins } from "@/hooks/use-kittycoins";
import SiteBrandWordmark from "@/components/layout/site-brand-wordmark";

function DesktopSearchTrigger({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group hidden h-9 min-w-0 max-w-md flex-1 items-center rounded-full border border-border/60 bg-muted/30",
        "text-muted-foreground transition-colors hover:border-primary/25 hover:bg-primary/[0.06] hover:text-foreground",
        "dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-white/45 dark:hover:border-primary/20 dark:hover:bg-primary/[0.05] dark:hover:text-white/80",
        "lg:inline-flex xl:max-w-lg",
        "justify-start gap-2.5 px-3.5",
      )}
      aria-label={t("nav.aria.openSearch")}
    >
      <SearchIcon className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
      <span className="min-w-0 flex-1 truncate text-left text-[13px] opacity-80 transition-opacity group-hover:opacity-100">
        {t("search.placeholder")}
      </span>
      <kbd className="pointer-events-none hidden shrink-0 rounded-md border border-border/70 bg-background/80 px-1.5 py-0.5 text-[10px] font-mono leading-none text-muted-foreground/70 lg:inline-block dark:border-white/[0.06] dark:bg-black/20 dark:text-white/20">
        Ctrl&nbsp;K
      </kbd>
    </button>
  );
}

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
  const authBag = React.useMemo(
    () => ({ auth: user, setAuth, clearAuth }),
    [user, setAuth, clearAuth],
  );

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
          const me = await anisurgeAuth.me();
          if (!cancelled) setAuth(authFromMeResponse(me));
        } catch (e: unknown) {
          const status = (e as { status?: number })?.status;
          if (!cancelled && status === 401 && hasLikelyAuthSession()) {
            clearAnisurgeToken();
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
      void anisurgeAuth
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
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (isLanding) return null;

  return (
    <header className="site-header fixed left-0 right-0 top-0 z-[100] pt-safe">
      <Container className="relative">
        {searchOpen && (
          <div className="site-search-overlay absolute inset-x-0 top-0 z-30 flex h-[var(--nav-height)] items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur-xl dark:border-white/[0.05] dark:bg-[#050508]/98">
            <SearchBar className="mx-auto max-w-3xl flex-1" autoFocus onAnimeClick={() => setSearchOpen(false)} />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:text-white/50 dark:hover:bg-white/8 dark:hover:text-white"
              aria-label={t("nav.aria.closeSearch")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex h-[var(--nav-height)] items-center gap-3">
          <Link
            href={ROUTES.HOME}
            className="group relative z-20 flex shrink-0 items-center py-0.5 transition-opacity hover:opacity-90"
          >
            <SiteBrandWordmark size="nav" />
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <DesktopSearchTrigger onClick={() => setSearchOpen(true)} />
          </div>

          <div className="relative z-20 ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white lg:hidden"
              aria-label={t("nav.aria.openSearch")}
            >
              <SearchIcon className="h-4 w-4" />
            </button>
            {user && <KittycoinPill />}
            {user && <NotificationBell />}
            {user ? <NavbarAvatar auth={authBag} /> : <LoginPopoverButton />}
          </div>
        </div>
      </Container>
    </header>
  );
};

export default NavBar;
