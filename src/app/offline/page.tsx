import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Offline | AniKitty",
  robots: { index: false },
};

/** Shown by the service worker when a navigation happens with no connection. */
export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 gap-5">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.04] text-muted-foreground dark:text-white/55"
        aria-hidden
      >
        <WifiOff className="h-6 w-6" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">
          You&apos;re offline
        </h1>
        <p className="text-sm text-muted-foreground dark:text-white/50 leading-relaxed">
          No internet connection right now. Check your network and try again — local watch
          progress stays on this device and syncs when you&apos;re back.
        </p>
      </div>
      <Link
        href={ROUTES.HOME}
        className="site-brand-btn site-focus mt-1 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
      >
        Try again
      </Link>
    </div>
  );
}
