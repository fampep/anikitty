"use client";

import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { MessageCircle } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl border border-indigo-500/15 bg-gradient-to-r from-indigo-500/[0.08] via-sky-500/[0.04] to-transparent">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-400/20 text-indigo-300">
            <MessageCircle className="h-4 w-4" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[12px] font-semibold text-foreground/85 dark:text-white/75">
              {t("home.socialBannerTitle")}
            </p>
            <p className="text-[11px] text-muted-foreground dark:text-white/45 leading-relaxed mt-0.5">
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
        </div>
      </div>
    </Container>
  );
}
