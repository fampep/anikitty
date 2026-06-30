"use client";

import { useEffect } from "react";
import LoadingGirl from "@/components/common/loading-girl";
import { useT } from "@/providers/i18n-provider";

/** Recover silently from transient player/runtime errors instead of flashing the global error page. */
export default function WatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("[watch] auto-recovering from error:", error);
    reset();
  }, [error, reset]);

  return (
    <div className="w-full aspect-video bg-black flex items-center justify-center rounded-xl border border-white/10">
      <LoadingGirl size={160} label={t("watch.loadingStream")} />
    </div>
  );
}
