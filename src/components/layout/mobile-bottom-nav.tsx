"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Captions,
  Compass,
  Home,
  MessageCircle,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

const TABS = [
  { href: ROUTES.HOME, icon: Home, labelKey: "nav.short.home", match: (p: string) => p === ROUTES.HOME },
  { href: ROUTES.SEARCH, icon: Compass, labelKey: "nav.short.search", match: (p: string) => p === ROUTES.SEARCH || p.startsWith("/search") },
  { href: ROUTES.SCHEDULE, icon: CalendarDays, labelKey: "nav.short.schedule", match: (p: string) => p === ROUTES.SCHEDULE },
  { href: ROUTES.FORUM, icon: MessagesSquare, labelKey: "nav.short.forum", match: (p: string) => p === ROUTES.FORUM || p.startsWith("/forum") },
  { href: ROUTES.CHAT, icon: MessageCircle, labelKey: "nav.short.chat", match: (p: string) => p === ROUTES.CHAT },
  { href: ROUTES.SUBTITLES, icon: Captions, labelKey: "nav.short.subtitles", match: (p: string) => p === ROUTES.SUBTITLES },
] as const;

function shouldHideBottomNav(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/anime/watch")) return true;
  if (pathname.startsWith("/admin")) return true;
  return false;
}

export default function MobileBottomNav() {
  const t = useT();
  const pathname = usePathname();

  if (shouldHideBottomNav(pathname)) return null;

  return (
    <>
      <div className="h-[var(--mobile-nav-total)] shrink-0 lg:hidden" aria-hidden />
      <nav
        aria-label={t("nav.aria.mobileBottomNav")}
        className="fixed inset-x-0 bottom-0 z-[95] lg:hidden pointer-events-none"
      >
        <div className="mx-auto max-w-lg px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto flex items-center justify-between gap-0.5 rounded-full border border-border/80 bg-background/92 px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0a10]/92">
            {TABS.map(({ href, icon: Icon, labelKey, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  title={t(labelKey)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 min-h-[44px] transition-colors",
                    active
                      ? "text-foreground dark:text-white"
                      : "text-muted-foreground/70 hover:text-foreground/80 dark:text-white/45 dark:hover:text-white/75",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                      active && "bg-accent dark:bg-white/12",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px]", active && "text-violet-300 dark:text-violet-200")} strokeWidth={active ? 2.25 : 2} />
                  </span>
                  <span className="sr-only">{t(labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
