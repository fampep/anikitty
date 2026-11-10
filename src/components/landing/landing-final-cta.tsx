"use client";

import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";
import { useT } from "@/providers/i18n-provider";
import { trackEvent } from "@/lib/analytics";
import { useOpenSignups } from "@/hooks/use-open-signups";
import TelegramIcon from "@/icons/telegram";

export default function LandingFinalCta() {
  const t = useT();
  const isLoggedIn = !!useAuthStore((s) => s.auth);
  const { open: openSignups, telegramUrl, loaded } = useOpenSignups();
  const signupsClosed = loaded && !openSignups;

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-16 sm:py-20 border-t border-white/[0.06]">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white/95 mb-3">
          {t("landing.finalCtaTitle")}
        </h2>
        <p className="text-sm sm:text-base text-white/45 mb-8 leading-relaxed">
          {signupsClosed && !isLoggedIn
            ? t("landing.finalCtaDescClosed")
            : t("landing.finalCtaDesc")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {isLoggedIn ? (
            <Link
              href={ROUTES.HOME}
              prefetch
              onClick={() => trackEvent("landing_final_cta")}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all text-sm shadow-xl shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 w-full sm:w-auto justify-center"
            >
              {t("landing.browseAnime")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : signupsClosed ? (
            <>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("landing_final_telegram")}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-sky-500 text-white font-bold rounded-2xl hover:bg-sky-400 active:scale-[0.98] transition-all text-sm shadow-xl shadow-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/40 w-full sm:w-auto justify-center"
              >
                <TelegramIcon className="h-4 w-4" />
                {t("landing.telegramWaitlistCta")}
              </a>
              <LoginPopoverButton
                defaultTab="login"
                customTrigger={
                  <button
                    type="button"
                    onClick={() => trackEvent("landing_final_signin")}
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/5 text-white/80 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white transition-all text-sm w-full sm:w-auto justify-center"
                  >
                    {t("landing.signIn")}
                  </button>
                }
              />
            </>
          ) : (
            <>
              <LoginPopoverButton
                defaultTab="signup"
                customTrigger={
                  <button
                    type="button"
                    onClick={() => trackEvent("landing_final_signup")}
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all text-sm shadow-xl shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 w-full sm:w-auto justify-center"
                  >
                    <UserPlus className="w-4 h-4" />
                    {t("landing.createAccount")}
                  </button>
                }
              />
              <LoginPopoverButton
                defaultTab="login"
                customTrigger={
                  <button
                    type="button"
                    onClick={() => trackEvent("landing_final_signin")}
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/5 text-white/80 border border-white/12 font-semibold rounded-2xl hover:bg-white/8 hover:text-white transition-all text-sm w-full sm:w-auto justify-center"
                  >
                    {t("landing.signIn")}
                  </button>
                }
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
