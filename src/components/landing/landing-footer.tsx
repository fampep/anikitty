"use client";

import Link from "next/link";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { ROUTES } from "@/constants/routes";
import { DISCORD_INVITE_URL, OFFICIAL_DOMAINS, TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";
import TelegramIcon from "@/icons/telegram";
import { useT } from "@/providers/i18n-provider";

const FOOTER_LINK =
  "text-muted-foreground dark:text-white/35 hover:text-foreground dark:hover:text-white/70 transition-colors";

export default function LandingFooter() {
  const t = useT();

  return (
    <footer className="relative z-10 border-t border-border dark:border-white/6 px-4 sm:px-6 md:px-12 py-8 pb-safe">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground/50 dark:text-white/15 text-[11px] font-mono mb-3">
            © {new Date().getFullYear()} AniKitty
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/30 mb-1.5">
            {t("landing.officialDomains")}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] mb-4">
            {OFFICIAL_DOMAINS.map((domain, i) => (
              <span key={domain.host} className="contents">
                {i > 0 && <span className="text-white/15" aria-hidden>·</span>}
                <a
                  href={domain.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/45 hover:text-white/75 transition-colors"
                >
                  {domain.host}
                </a>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium">
            <Link href={ROUTES.FAQ} className={FOOTER_LINK}>{t("nav.faq")}</Link>
            <Link href={ROUTES.COMMUNITY} className={FOOTER_LINK}>{t("nav.community")}</Link>
            <a href="/#support" className={FOOTER_LINK}>{t("nav.donate")}</a>
            <Link href={ROUTES.FORUM} className={FOOTER_LINK}>{t("nav.forum")}</Link>
            <Link href={ROUTES.STATUS} className={FOOTER_LINK}>{t("nav.status")}</Link>
            <a
              href={TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
            >
              {t("footer.telegram")}
            </a>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
            >
              {t("footer.discord")}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 dark:text-white/20 hover:text-foreground dark:hover:text-white/55 transition-colors"
            aria-label={t("footer.telegram")}
            title={t("landing.socialHint")}
          >
            <TelegramIcon className="h-4 w-4" />
          </a>
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 dark:text-white/20 hover:text-foreground dark:hover:text-white/55 transition-colors"
            aria-label={t("footer.discord")}
          >
            <DiscordLogoIcon width="16" height="16" />
          </a>
          <a
            href="https://github.com/fampep/anikitty"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 dark:text-white/20 hover:text-foreground dark:hover:text-white/55 transition-colors"
            aria-label={t("footer.github")}
          >
            <GitHubLogoIcon width="16" height="16" />
          </a>
        </div>
      </div>
    </footer>
  );
}
