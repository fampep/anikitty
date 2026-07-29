"use client";

import Link from "next/link";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import SiteBrandWordmark from "@/components/layout/site-brand-wordmark";
import { ROUTES } from "@/constants/routes";
import { DISCORD_INVITE_URL, OFFICIAL_DOMAINS, TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";
import TelegramIcon from "@/icons/telegram";
import { useT } from "@/providers/i18n-provider";

const FOOTER_LINK =
  "text-white/35 hover:text-white/70 transition-colors";

export default function LandingFooter() {
  const t = useT();

  return (
    <footer className="relative z-10 border-t border-white/[0.06] px-4 sm:px-6 md:px-12 py-10 sm:py-12 pb-safe">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <SiteBrandWordmark size="footer" className="mb-3" />
            <p className="text-[13px] text-white/35 leading-relaxed max-w-xs mb-4">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-3.5">
              <a
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/25 hover:text-white/60 transition-colors"
                aria-label={t("footer.telegram")}
                title={t("landing.socialHint")}
              >
                <TelegramIcon className="h-4 w-4" />
              </a>
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/25 hover:text-white/60 transition-colors"
                aria-label={t("footer.discord")}
              >
                <DiscordLogoIcon width="16" height="16" />
              </a>
              <a
                href="https://github.com/fampep/anikitty"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/25 hover:text-white/60 transition-colors"
                aria-label={t("footer.github")}
              >
                <GitHubLogoIcon width="16" height="16" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-3">
              {t("landing.footerBrowse")}
            </p>
            <ul className="space-y-2 text-[13px] font-medium">
              <li><Link href={ROUTES.HOME} className={FOOTER_LINK}>{t("nav.home")}</Link></li>
              <li><Link href={ROUTES.TRENDING} className={FOOTER_LINK}>{t("nav.trending")}</Link></li>
              <li><Link href={ROUTES.SCHEDULE} className={FOOTER_LINK}>{t("nav.schedule")}</Link></li>
              <li><Link href={ROUTES.SEARCH} className={FOOTER_LINK}>{t("nav.search")}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-3">
              {t("landing.footerCommunity")}
            </p>
            <ul className="space-y-2 text-[13px] font-medium">
              <li><Link href={ROUTES.COMMUNITY} className={FOOTER_LINK}>{t("nav.community")}</Link></li>
              <li><Link href={ROUTES.FORUM} className={FOOTER_LINK}>{t("nav.forum")}</Link></li>
              <li><Link href={ROUTES.CHAT} className={FOOTER_LINK}>{t("nav.chat")}</Link></li>
              <li><a href="/#support" className={FOOTER_LINK}>{t("nav.donate")}</a></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30 mb-3">
              {t("landing.footerHelp")}
            </p>
            <ul className="space-y-2 text-[13px] font-medium">
              <li><Link href={ROUTES.FAQ} className={FOOTER_LINK}>{t("nav.faq")}</Link></li>
              <li><Link href={ROUTES.STATUS} className={FOOTER_LINK}>{t("nav.status")}</Link></li>
              <li><Link href={ROUTES.DMCA} className={FOOTER_LINK}>{t("nav.dmca")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <p className="text-white/15 text-[11px] font-mono mb-2">
              © {new Date().getFullYear()} AniKitty
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/28 mb-1.5">
              {t("landing.officialDomains")}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              {OFFICIAL_DOMAINS.map((domain, i) => (
                <span key={domain.host} className="contents">
                  {i > 0 && <span className="text-white/15" aria-hidden>·</span>}
                  <a
                    href={domain.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    {domain.host}
                  </a>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
