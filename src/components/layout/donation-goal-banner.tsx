"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { Heart, Megaphone } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { getDonationProgress } from "@/lib/social/donation-config";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

export default function DonationGoalBanner() {
  const t = useT();
  const { goalEur, raisedEur, percent } = getDonationProgress();
  const goalReached = percent >= 100;
  const showProgress = raisedEur > 0;
  const bannerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const lastOffsetRef = useRef(0);

  useLayoutEffect(() => {
    const applyOffset = (rawHeight: number) => {
      const offset = rawHeight > 0 ? rawHeight + 8 : 0;
      if (offset === lastOffsetRef.current) return;
      lastOffsetRef.current = offset;
      document.documentElement.style.setProperty("--donation-banner-offset", `${offset}px`);
      if (spacerRef.current) {
        spacerRef.current.style.height = `${offset}px`;
      }
    };

    const measure = () => {
      applyOffset(bannerRef.current?.offsetHeight ?? 0);
    };

    measure();

    const el = bannerRef.current;
    if (!el) {
      return () => {
        lastOffsetRef.current = 0;
        document.documentElement.style.setProperty("--donation-banner-offset", "0px");
      };
    }

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => {
      ro.disconnect();
      lastOffsetRef.current = 0;
      document.documentElement.style.setProperty("--donation-banner-offset", "0px");
      if (spacerRef.current) spacerRef.current.style.height = "0px";
    };
  }, [goalReached, showProgress, percent]);

  return (
    <>
      <div ref={spacerRef} aria-hidden className="shrink-0" />
      <div
        ref={bannerRef}
        className="pointer-events-none fixed left-0 right-0 top-[var(--nav-height)] z-[89] px-2 pt-2 sm:px-4"
      >
        <div
          className={cn(
            "pointer-events-auto mx-auto flex w-full max-w-[1400px] items-center gap-2.5 rounded-lg border px-3 py-2 backdrop-blur-md shadow-lg shadow-black/20 sm:gap-3 sm:px-4 sm:py-2.5",
            goalReached
              ? "border-emerald-500/25 bg-emerald-500/[0.08]"
              : "border-violet-500/25 bg-violet-500/[0.08]",
          )}
        >
          <Megaphone
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              goalReached ? "text-emerald-300" : "text-violet-300",
            )}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <p
              className={cn(
                "min-w-0 text-[11.5px] font-medium leading-snug sm:text-[12px]",
                goalReached ? "text-emerald-100" : "text-white/80",
              )}
            >
              {goalReached
                ? t("donate.banner.reached")
                : showProgress
                  ? t("donate.banner.progress", {
                      amount: raisedEur.toFixed(0),
                      goal: goalEur,
                    })
                  : t("donate.banner.goal", { goal: goalEur })}
            </p>

            {!goalReached && (
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[200px]">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 via-violet-400 to-fuchsia-400 transition-all duration-700"
                    style={{ width: `${Math.max(showProgress ? percent : 8, 4)}%` }}
                  />
                </div>
                {showProgress && (
                  <span className="shrink-0 text-[10px] font-mono tabular-nums text-violet-300/80">
                    {percent}%
                  </span>
                )}
              </div>
            )}
          </div>

          <Link
            href={ROUTES.DONATE}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors sm:text-[11.5px]",
              goalReached
                ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                : "border-violet-400/25 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25",
            )}
          >
            <Heart className="h-3 w-3 opacity-80" />
            {t("donate.banner.cta")}
          </Link>
        </div>
      </div>
    </>
  );
}
