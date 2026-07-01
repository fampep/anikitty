"use client";

import Link from "next/link";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import LanguageSwitcher from "@/components/layout/language-switcher";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

export default function LandingFooter() {
  const t = useT();

  return (
    <footer className="relative z-10 border-t border-white/6 px-4 sm:px-6 md:px-12 py-8 pb-safe">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
        <div>
          <p className="text-white/15 text-[11px] font-mono mb-3">
            © {new Date().getFullYear()} anikitty.moe
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium text-white/35">
            <Link href={ROUTES.FAQ} className="hover:text-white/70 transition-colors">{t("nav.faq")}</Link>
            <Link href={ROUTES.DONATE} className="hover:text-white/70 transition-colors">{t("nav.donate")}</Link>
            <Link href={ROUTES.FORUM} className="hover:text-white/70 transition-colors">{t("nav.forum")}</Link>
            <a
              href="https://discord.gg/gD8QTfkhHq"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/70 transition-colors"
            >
              {t("footer.discord")}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher compact />
          <a
            href="https://discord.gg/gD8QTfkhHq"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 hover:text-white/55 transition-colors"
            aria-label={t("footer.discord")}
          >
            <DiscordLogoIcon width="16" height="16" />
          </a>
          <a
            href="https://github.com/fampep/anikitty"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/20 hover:text-white/55 transition-colors"
            aria-label={t("footer.github")}
          >
            <GitHubLogoIcon width="16" height="16" />
          </a>
        </div>
      </div>
    </footer>
  );
}
