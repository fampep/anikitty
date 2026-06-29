"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { Flame, CalendarDays, Search, Captions } from "lucide-react";
import { usePathname } from "next/navigation";
import { useOnlineCount } from "@/hooks/use-online-count";
import { useT } from "@/providers/i18n-provider";
import LanguageSwitcher from "@/components/language-switcher";

const KITTY_ICON = "/jiji.jpg";

const Footer = () => {
  const t = useT();
  const pathname = usePathname();
  const count = useOnlineCount();

  if (pathname === "/") return null;

  return (
    <footer className="w-full mt-16 relative overflow-hidden border-t border-white/[0.06]">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.02] to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/15 to-transparent" />

      <div className="max-w-screen-xl mx-auto px-6 py-14 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-10 border-b border-white/[0.06]">

          <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-violet-400/25 shadow-[0_0_12px_rgba(124,58,237,0.12)]">
                <Image src={KITTY_ICON} alt="AniKitty" fill className="object-cover object-top" unoptimized />
              </div>
              <p className="text-base font-bold text-white/90 tracking-widest">AniKitty</p>
            </div>
            <p className="text-[11px] text-white/20 font-mono leading-relaxed max-w-[180px]">
              {t("footer.tagline")}
            </p>

            {count !== null && (
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[11px] text-white/30 font-mono">
                  {t("footer.online", { count: count.toLocaleString() })}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              <a
                href="https://github.com/fampep/anikitty"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-white/70 hover:border-white/25 transition-all"
              >
                <GitHubLogoIcon width="14" height="14" />
              </a>
              <a
                href="https://discord.gg/gD8QTfkhHq"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-white/70 hover:border-white/25 transition-all"
              >
                <DiscordLogoIcon width="14" height="14" />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">{t("footer.browse")}</p>
            <NavLink href="/home" label={t("nav.home")} />
            <NavLink href="/search" label={t("nav.search")} icon={<Search className="w-3 h-3" />} />
            <NavLink href="/trending" label={t("nav.trending")} icon={<Flame className="w-3 h-3" />} />
            <NavLink href="/subtitles" label={t("nav.subtitles")} icon={<Captions className="w-3 h-3" />} />
            <NavLink href="/schedule" label={t("nav.schedule")} icon={<CalendarDays className="w-3 h-3" />} />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">{t("footer.account")}</p>
            <NavLink href="/settings" label={t("footer.settings")} />
            <NavLink href="/faq" label={t("nav.faq")} />
            <div className="pt-1">
              <LanguageSwitcher compact />
            </div>
            <a
              href="https://www.anisurge.lol/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/35 hover:text-white/65 transition-colors"
            >
              {t("footer.anisurgeExternal")}
            </a>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">{t("footer.project")}</p>
            <NavLink href="/faq" label={t("footer.faqPrivacy")} />
            <a
              href="https://github.com/fampep/anikitty"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white/35 hover:text-white/65 transition-colors"
            >
              <GitHubLogoIcon width="13" height="13" />
              {t("footer.github")}
            </a>
            <a
              href="https://discord.gg/gD8QTfkhHq"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white/35 hover:text-white/65 transition-colors"
            >
              <DiscordLogoIcon width="13" height="13" />
              {t("footer.discord")}
            </a>
            <a
              href="https://kittyapi.buzz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/35 hover:text-white/65 transition-colors"
            >
              {t("footer.kittyApi")}
            </a>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/18 text-center sm:text-left leading-relaxed max-w-lg">
            {t("footer.disclaimer")}
          </p>
          <p className="text-[11px] text-white/15 shrink-0 font-mono">
            © {new Date().getFullYear()} anikitty.moe
          </p>
        </div>
      </div>
    </footer>
  );
};

function NavLink({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-violet-200/90 transition-colors">
      {icon && <span className="text-white/25">{icon}</span>}
      {label}
    </Link>
  );
}

export default Footer;
