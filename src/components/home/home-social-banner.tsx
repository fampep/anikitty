"use client";

import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { Heart } from "lucide-react";
import Container from "@/components/layout/container";
import TelegramIcon from "@/icons/telegram";
import { DISCORD_INVITE_URL, TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";
import { useT } from "@/providers/i18n-provider";

const ICON_BTN =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all hover:text-foreground hover:border-border/80 hover:bg-accent/60 dark:border-white/10 dark:text-white/45 dark:hover:text-white/85 dark:hover:border-white/20 dark:hover:bg-white/[0.06]";

export default function HomeSocialBanner() {
  const t = useT();

  return (
    <Container className="py-1 sm:py-1.5">
      <div className="site-panel flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
            <Heart className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground dark:text-white/85">
              {t("home.socialBannerTitle")}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground dark:text-white/40">
              {t("home.socialBannerBody")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
    </Container>
  );
}
