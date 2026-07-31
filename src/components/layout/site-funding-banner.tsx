"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Server, X } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { isPublicAdminUiPath } from "@/lib/security/admin-panel-path-public";

/** Bump to re-show the banner after copy changes. */
const DISMISS_KEY = "anikitty:funding-banner-v1";

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
 * Honest notice that proxy capacity was downscaled to keep the site affordable.
 * Parent (`SiteAnnouncementBanner`) includes this in the shared height offset.
 */
export default function SiteFundingBanner({ className }: Props) {
  const t = useT();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed());
    setHydrated(true);
  }, []);

  const hidePath =
    pathname?.startsWith("/anime/watch") ||
    isPublicAdminUiPath(pathname) ||
    pathname?.startsWith("/auth");

  if (!hydrated || dismissed || hidePath) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-[1400px] flex items-center gap-2.5 px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-lg shadow-black/20",
        "border-amber-500/25 bg-amber-500/[0.08]",
        className,
      )}
    >
      <Server className="w-3.5 h-3.5 shrink-0 text-amber-300" />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-[12px] font-semibold text-amber-100">
          {t("fundingBanner.title")}
        </p>
        <p className="text-[11px] text-muted-foreground dark:text-white/55 line-clamp-2 sm:truncate sm:line-clamp-1">
          {t("fundingBanner.body")}
        </p>
      </div>
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
