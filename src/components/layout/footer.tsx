"use client";

import React from "react";
import Link from "next/link";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { Flame, CalendarDays, Search, Captions, Coffee, Tv2, MessageSquare, Activity, Scale, History, Library, Timer } from "lucide-react";
import { usePathname } from "next/navigation";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { DISCORD_INVITE_URL, TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";
import { ROUTES } from "@/constants/routes";
import SiteVersionLabel from "@/components/layout/site-version-label";
import SiteBrandWordmark from "@/components/layout/site-brand-wordmark";
import TelegramIcon from "@/icons/telegram";

const Footer = () => {
  const t = useT();
  const pathname = usePathname();
  const showOnlineCountPref = useSettingsStore((s) => s.showOnlineCount);
  // Display-only subscription — heartbeat already runs from root OnlinePresence.
  const count = useOnlineCount(showOnlineCountPref);

  if (pathname === "/") return null;

  return (
    <footer className="relative z-10 w-full mt-20 overflow-hidden border-t border-border bg-background dark:border-white/[0.08]">

      <div className="mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px] px-4 md:px-6 lg:px-8 py-10 sm:py-16 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-10 border-b border-border dark:border-white/[0.06]">

          <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
            <Link href={ROUTES.HOME} className="inline-flex w-fit transition-opacity hover:opacity-90">
              <SiteBrandWordmark size="footer" />
            </Link>
            <p className="text-[11px] text-muted-foreground font-mono leading-relaxed max-w-[180px]">
              {t("footer.tagline")}
            </p>

            {showOnlineCountPref && count !== null && (
              <div
                className="inline-flex items-center gap-2 mt-0.5 w-fit rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-1"
                title={t("footer.online", { count: count.toLocaleString() })}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[11px] font-mono tabular-nums text-emerald-700/90 dark:text-emerald-300/90">
                  {t("footer.online", { count: count.toLocaleString() })}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              <a
                href="https://github.com/fampep/anikitty"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("footer.github")}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border transition-all dark:border-white/10 dark:text-white/30 dark:hover:text-white/70 dark:hover:border-white/25"
              >
                <GitHubLogoIcon width="14" height="14" />
              </a>
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("footer.discord")}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border transition-all dark:border-white/10 dark:text-white/30 dark:hover:text-white/70 dark:hover:border-white/25"
              >
                <DiscordLogoIcon width="14" height="14" />
              </a>
              <a
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("footer.telegram")}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border transition-all dark:border-white/10 dark:text-white/30 dark:hover:text-white/70 dark:hover:border-white/25"
              >
                <TelegramIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-white/35">{t("footer.browse")}</p>
            <NavLink href="/home" label={t("nav.home")} />
            <NavLink href="/new" label={t("nav.newReleases")} icon={<Tv2 className="w-3 h-3" />} />
            <NavLink href="/search" label={t("nav.search")} icon={<Search className="w-3 h-3" />} />
            <NavLink href="/trending" label={t("nav.trending")} icon={<Flame className="w-3 h-3" />} />
            <NavLink href="/community" label={t("nav.community")} icon={<MessageSquare className="w-3 h-3" />} />
            <NavLink href="/subtitles" label={t("nav.subtitles")} icon={<Captions className="w-3 h-3" />} />
            <NavLink href="/schedule" label={t("nav.schedule")} icon={<CalendarDays className="w-3 h-3" />} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-white/35">{t("footer.account")}</p>
            <NavLink href="/settings" label={t("footer.settings")} />
            <NavLink href={ROUTES.HISTORY} label={t("footer.history")} icon={<History className="w-3 h-3" />} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-white/35">{t("footer.project")}</p>
            <NavLink href="/donate" label={t("footer.donate")} icon={<Coffee className="w-3 h-3" />} />
            <NavLink href={ROUTES.STATUS} label={t("nav.status")} icon={<Activity className="w-3 h-3" />} />
            <NavLink href="/changelog" label={t("footer.changelog")} icon={<History className="w-3 h-3" />} />
            <NavLink href="/collections" label={t("footer.collections")} icon={<Library className="w-3 h-3" />} />
            <NavLink href={ROUTES.TIMESTAMPS} label={t("footer.timestamps")} icon={<Timer className="w-3 h-3" />} />
            <NavLink href="/faq" label={t("footer.faqPrivacy")} />
            <NavLink href={ROUTES.DMCA} label={t("footer.dmca")} icon={<Scale className="w-3 h-3" />} />
            <a
              href="https://github.com/fampep/anikitty"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors dark:text-white/35 dark:hover:text-white/65"
            >
              <GitHubLogoIcon width="13" height="13" />
              {t("footer.github")}
            </a>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors dark:text-white/35 dark:hover:text-white/65"
            >
              <DiscordLogoIcon width="13" height="13" />
              Discord › AniKitty
            </a>
            <a
              href={TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors dark:text-white/35 dark:hover:text-white/65"
            >
              <TelegramIcon className="h-3.5 w-3.5" />
              {t("footer.telegram")}
            </a>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground/80 text-center sm:text-left leading-relaxed max-w-lg dark:text-white/18">
            {t("footer.disclaimer")}
          </p>
          <div className="flex flex-col items-center gap-2 sm:items-end shrink-0">
            <SiteVersionLabel />
            <p className="text-[11px] text-muted-foreground/70 font-mono dark:text-white/15">
              © {new Date().getFullYear()} anikitty.moe
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

function NavLink({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 min-h-11 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors dark:text-white/40 dark:hover:text-white/80">
      {icon && <span className="text-muted-foreground/70 dark:text-white/25">{icon}</span>}
      {label}
    </Link>
  );
}

export default Footer;
