"use client";

import Link from "next/link";
import { ExternalLink, MessageSquare, Bug, Activity, Settings } from "lucide-react";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { ROUTES } from "@/constants/routes";
import { DISCORD_INVITE_URL } from "@/constants/site-meta";
import { useT } from "@/providers/i18n-provider";

const GITHUB_REPO = "https://github.com/fampep/anikitty";
const GITHUB_ISSUE = `${GITHUB_REPO}/issues/new`;

export default function FaqHelpFooter() {
  const t = useT();

  return (
    <section className="site-panel mt-12 p-5 sm:p-6" aria-labelledby="faq-still-help">
      <h2 id="faq-still-help" className="text-sm font-semibold text-foreground/90 dark:text-white/80">
        {t("faq.stillNeedHelp")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground dark:text-white/45">
        {t("faq.contactDesc")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <a
          href={DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:border-white/12 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
        >
          <DiscordLogoIcon width={14} height={14} />
          {t("footer.discord")}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
        <Link
          href={ROUTES.CHAT}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:border-white/12 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {t("faq.openChat")}
        </Link>
        <a
          href={GITHUB_ISSUE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:border-white/12 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
        >
          <Bug className="h-3.5 w-3.5" />
          {t("faq.reportBug")}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
        <Link
          href={ROUTES.STATUS}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:border-white/12 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
        >
          <Activity className="h-3.5 w-3.5" />
          {t("faq.statusPage")}
        </Link>
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:border-white/12 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
        >
          <GitHubLogoIcon width={14} height={14} />
          {t("footer.github")}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
        <Link
          href={ROUTES.SETTINGS}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/20 px-3.5 py-2 text-sm text-zinc-200 transition-colors hover:bg-primary/30"
        >
          <Settings className="h-3.5 w-3.5" />
          {t("faq.accountSettings")}
        </Link>
      </div>
    </section>
  );
}
