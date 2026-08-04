"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Heart, X } from "lucide-react";
import {
  KOFI_DONATION_UNIT_DAYS,
  KOFI_DONATION_UNIT_EUR,
  kofiDonationUrl,
} from "@/lib/social/donation-config";
import { hasActiveDonatorStatus } from "@/lib/social/supporter-status";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { isPublicAdminUiPath } from "@/lib/security/admin-panel-path-public";

/** Bump to re-show the banner after copy changes. */
const DISMISS_KEY = "anikitty:support-banner-v1";

function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

type Props = {
  className?: string;
};

/**
 * Slim tip-perks strip for home + most app pages.
 * Parent (`SiteAnnouncementBanner`) includes this in the shared height offset.
 */
export default function SiteSupportBanner({ className }: Props) {
  const t = useT();
  const pathname = usePathname();
  const auth = useAuthStore((s) => s.auth);
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed());
    setHydrated(true);
  }, []);

  const hidePath =
    pathname === "/" ||
    pathname === ROUTES.DONATE ||
    pathname?.startsWith("/anime/watch") ||
    isPublicAdminUiPath(pathname) ||
    pathname?.startsWith("/auth");

  const isDonator = hasActiveDonatorStatus(auth?.role, auth?.supporterUntil);

  if (!hydrated || dismissed || hidePath || isDonator) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-[1400px] flex items-center gap-2.5 px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-lg shadow-black/20",
        "border-zinc-500/20 bg-zinc-500/[0.08]",
        className,
      )}
    >
      <Heart className="w-3.5 h-3.5 shrink-0 text-zinc-300 fill-zinc-300/20" />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-[12px] font-semibold text-zinc-100">
          {t("supportBanner.title", {
            amount: KOFI_DONATION_UNIT_EUR,
            days: KOFI_DONATION_UNIT_DAYS,
          })}
        </p>
        <p className="text-[11px] text-muted-foreground dark:text-white/50 line-clamp-2 sm:truncate sm:line-clamp-1">
          {t("supportBanner.body")}
        </p>
      </div>
      <a
        href={kofiDonationUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1 rounded-lg border border-border dark:border-white/15 bg-accent dark:bg-white/[0.06] text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/12 transition-colors"
      >
        {t("supportBanner.cta")}
        <ArrowRight className="w-3 h-3" />
      </a>
      <Link
        href={ROUTES.DONATE}
        className="hidden sm:inline-flex shrink-0 text-[11px] font-medium text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75 transition-colors"
      >
        {t("supportBanner.learn")}
      </Link>
      <button
        type="button"
        onClick={() => {
          writeDismissed();
          setDismissed(true);
        }}
        className="shrink-0 p-1 rounded-md text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white hover:bg-accent dark:hover:bg-white/8 transition-colors"
        aria-label={t("common.dismiss")}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
