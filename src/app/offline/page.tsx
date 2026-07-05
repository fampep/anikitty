import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Offline | AniKitty",
  robots: { index: false },
};

// Shown by the service worker when a navigation happens with no connection.
export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 gap-4">
      <div className="text-5xl" aria-hidden>
        🐾
      </div>
      <h1 className="text-2xl font-bold text-foreground dark:text-white">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground dark:text-white/50">
        No internet connection right now. Check your network and try again — your watch history is
        saved and will sync when you&apos;re back.
      </p>
      <Link
        href={ROUTES.HOME}
        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/25 transition-colors"
      >
        Retry
      </Link>
    </div>
  );
}
