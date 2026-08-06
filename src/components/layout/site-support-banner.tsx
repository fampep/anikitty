"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Heart } from "lucide-react";
import { kofiDonationUrl } from "@/lib/social/donation-config";
import { hasActiveDonatorStatus } from "@/lib/social/supporter-status";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { isPublicAdminUiPath } from "@/lib/security/admin-panel-path-public";

type Props = {
  className?: string;
};

/**
 * Permanent support banner for all pages.
 * Replaces ads with a persistent request for Kifu support.
 */
export default function SiteSupportBanner({ className }: Props) {
  const t = useT();
  const pathname = usePathname();
  const auth = useAuthStore((s) => s.auth);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const hidePath =
    pathname === ROUTES.DONATE ||
    pathname?.startsWith("/anime/watch") ||
    isPublicAdminUiPath(pathname) ||
    pathname?.startsWith("/auth");

  const isDonator = hasActiveDonatorStatus(auth?.role, auth?.supporterUntil);

  if (!hydrated || hidePath || isDonator) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-[1400px] flex items-center gap-2.5 px-3 py-2 rounded-lg border backdrop-blur-md shadow-lg shadow-black/20",
        "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10",
        className,
      )}
    >
      <Heart className="w-4 h-4 shrink-0 text-amber-400 fill-amber-400" />
      <div className="flex-1 min-w-0 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <p className="text-[12px] font-bold text-amber-50">
          Please support us in Kifu to help cover server costs
        </p>
        <p className="text-[11px] text-amber-100/70 line-clamp-2 sm:truncate sm:line-clamp-1">
          Your contribution helps us maintain free streaming for everyone
        </p>
      </div>
      <a
        href={kofiDonationUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-700 transition-colors"
      >
        Donate Now
        <ArrowRight className="w-3 h-3" />
      </a>
      <Link
        href={ROUTES.DONATE}
        className="hidden sm:inline-flex shrink-0 text-[11px] font-medium text-amber-100/60 hover:text-amber-50 transition-colors"
      >
        Learn more
      </Link>
    </div>
  );
}
