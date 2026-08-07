"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { ArrowRight, Heart } from "lucide-react";
import TelegramIcon from "@/icons/telegram";
import { DISCORD_INVITE_URL, TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";
import { kofiDonationUrl } from "@/lib/social/donation-config";
import { hasActiveDonatorStatus } from "@/lib/social/supporter-status";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { isPublicAdminUiPath } from "@/lib/security/admin-panel-path-public";

type Props = {
  className?: string;
};

const ICON_BTN =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:text-foreground hover:border-border/80 hover:bg-accent/60 dark:border-white/10 dark:text-white/45 dark:hover:text-white/85 dark:hover:border-white/20 dark:hover:bg-white/[0.06]";

/**
 * Permanent support banner for all pages.
 * Replaces ads with a calmer AniKitty support panel.
 */
export default function SiteSupportBanner({ className }: Props) {
  const t = useT();
  const pathname = usePathname();
  const auth = useAuthStore((s) => s.auth);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const hidePath =
    pathname === ROUTES.HOME ||
    pathname === ROUTES.DONATE ||
    pathname?.startsWith("/anime/watch") ||
    isPublicAdminUiPath(pathname) ||
    pathname?.startsWith("/auth");

  const isDonator = hasActiveDonatorStatus(auth?.role, auth?.supporterUntil);

  if (!hydrated || hidePath || isDonator) return null;

  return (
    <div
      className={cn(
        "home-support-panel pointer-events-auto mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
          <Heart className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground dark:text-white/85">
            {t("home.socialBannerTitle")}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground dark:text-white/40 sm:line-clamp-1">
            {t("home.socialBannerBody")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <a
          href={kofiDonationUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="home-support-panel__button site-focus"
        >
          <Heart className="h-3.5 w-3.5" />
          <span>Support on Ko-Fi</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <Link
          href={ROUTES.DONATE}
          className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-all hover:border-border/80 hover:bg-accent/60 hover:text-foreground dark:border-white/10 dark:text-white/45 dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-white/85"
        >
          Learn more
        </Link>
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("footer.discord")}
          title={t("footer.discord")}
          className={ICON_BTN}
        >
          <DiscordLogoIcon width="16" height="16" />
        </a>
        <a
          href={TELEGRAM_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("footer.telegram")}
          title={t("footer.telegram")}
          className={ICON_BTN}
        >
          <TelegramIcon className="h-4 w-4" />
        </a>
        <a
          href="https://github.com/fampep/anikitty"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("footer.github")}
          title={t("footer.github")}
          className={ICON_BTN}
        >
          <GitHubLogoIcon width="16" height="16" />
        </a>
      </div>
    </div>
  );
}
