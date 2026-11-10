"use client";

import { Cloud, Laptop, Smartphone, Tablet, UserPlus } from "lucide-react";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import { useT } from "@/providers/i18n-provider";
import { trackEvent } from "@/lib/analytics";
import { useOpenSignups } from "@/hooks/use-open-signups";
import TelegramIcon from "@/icons/telegram";

export default function LandingSyncStory() {
  const t = useT();
  const isLoggedIn = !!useAuthStore((s) => s.auth);
  const { open: openSignups, telegramUrl, loaded } = useOpenSignups();
  const signupsClosed = loaded && !openSignups;

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
        <div>
          <p className="site-label mb-2">{t("landing.syncLabel")}</p>
          <h2 className="text-xl sm:text-2xl font-bold text-white/90 mb-3">
            {t("landing.syncTitle")}
          </h2>
          <p className="text-sm text-white/40 leading-relaxed mb-6 max-w-md">
            {t("landing.syncDesc")}
          </p>
          {!isLoggedIn && signupsClosed && (
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("landing_sync_telegram")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-400 transition-colors"
            >
              <TelegramIcon className="h-4 w-4" />
              {t("landing.telegramWaitlistCta")}
            </a>
          )}
          {!isLoggedIn && !signupsClosed && (
            <LoginPopoverButton
              defaultTab="signup"
              customTrigger={
                <button
                  type="button"
                  onClick={() => trackEvent("landing_sync_signup")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {t("landing.createAccount")}
                </button>
              }
            />
          )}
        </div>

        <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6 text-white/50">
            <Smartphone className="w-7 h-7" />
            <Tablet className="w-8 h-8" />
            <Laptop className="w-9 h-9" />
          </div>
          <div className="flex items-center justify-center gap-2 text-zinc-300/80 mb-4">
            <Cloud className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t("landing.syncBadge")}
            </span>
          </div>
          <ul className="space-y-2.5 text-[13px] text-white/45">
            <li className="flex gap-2">
              <span className="text-white/25">·</span>
              {t("landing.syncPoints.progress")}
            </li>
            <li className="flex gap-2">
              <span className="text-white/25">·</span>
              {t("landing.syncPoints.watchlist")}
            </li>
            <li className="flex gap-2">
              <span className="text-white/25">·</span>
              {t("landing.syncPoints.history")}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
