"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { Coffee, MessageCircle, Sparkles } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import {
  KOFI_DONATION_UNIT_DAYS,
  KOFI_DONATION_UNIT_EUR,
  KOFI_URL,
  SITE_OWNER_USERNAME,
  siteOwnerDmHref,
} from "@/lib/social/donation-config";
import { useT } from "@/providers/i18n-provider";

export default function SupporterBanner() {
  const t = useT();
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
  }, []);

  return (
    <>
      <div ref={spacerRef} aria-hidden className="shrink-0" />
      <div
        ref={bannerRef}
        className="pointer-events-none fixed left-0 right-0 top-[var(--nav-height)] z-[89] px-2 pt-2 sm:px-4"
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-[1400px] items-center gap-2.5 rounded-lg border border-violet-500/25 bg-violet-500/[0.08] px-3 py-2 backdrop-blur-md shadow-lg shadow-black/20 sm:gap-3 sm:px-4 sm:py-2.5">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-300" />

          <p className="min-w-0 flex-1 text-[11.5px] font-medium leading-snug text-white/80 sm:text-[12px]">
            {t("donate.banner.donation", {
              amount: KOFI_DONATION_UNIT_EUR,
              days: KOFI_DONATION_UNIT_DAYS,
            })}
          </p>

          <Link
            href={ROUTES.DONATE}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-400/25 bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-100 transition-colors hover:bg-violet-500/25 sm:text-[11.5px]"
          >
            {t("donate.banner.learnMore")}
          </Link>

          <Link
            href={siteOwnerDmHref()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/15 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-100 transition-colors hover:bg-fuchsia-500/25 sm:text-[11.5px]"
          >
            <MessageCircle className="h-3 w-3 opacity-80" />
            @{SITE_OWNER_USERNAME}
          </Link>

          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/75 transition-colors hover:bg-white/10 sm:text-[11.5px]"
          >
            <Coffee className="h-3 w-3 opacity-80" />
            {t("donate.banner.kofiCta")}
          </a>
        </div>
      </div>
    </>
  );
}
