"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/** Recover silently from transient player/runtime errors instead of flashing the global error page. */
export default function WatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[watch] auto-recovering from error:", error);
    reset();
  }, [error, reset]);

  return (
    <div className="w-full aspect-video bg-black flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10">
      <Loader2 className="w-6 h-6 text-white/25 animate-spin" />
      <p className="text-white/30 text-xs font-mono">Loading player…</p>
    </div>
  );
}
