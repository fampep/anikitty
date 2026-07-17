"use client";

import Link from "next/link";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { ROUTES } from "@/constants/routes";
import { DISCORD_INVITE_URL, TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";
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
            © {new Date().getFullYear()} anikitty.moe
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium">
            <Link href={ROUTES.FAQ} className={FOOTER_LINK}>{t("nav.faq")}</Link>
            <Link href={ROUTES.COMMUNITY} className={FOOTER_LINK}>{t("nav.community")}</Link>
            <Link href={ROUTES.DONATE} className={FOOTER_LINK}>{t("nav.donate")}</Link>
            <Link href={ROUTES.FORUM} className={FOOTER_LINK}>{t("nav.forum")}</Link>
            <Link href={ROUTES.STATUS} className={FOOTER_LINK}>{t("nav.status")}</Link>
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
            >
              {t("footer.discord")}
            </a>
            <a
              href={TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
            >
              {t("footer.telegram")}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
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
            href={TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 dark:text-white/20 hover:text-foreground dark:hover:text-white/55 transition-colors"
            aria-label={t("footer.telegram")}
          >
            <TelegramIcon className="h-4 w-4" />
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
