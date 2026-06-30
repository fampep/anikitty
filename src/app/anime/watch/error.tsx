"use client";

import { useEffect, useState } from "react";
import LoadingGirl from "@/components/common/loading-girl";
import WatchErrorPanel from "@/components/watch/watch-error-panel";
import { useT } from "@/providers/i18n-provider";

const WATCH_RETRY_KEY = "anikitty-watch-error-auto-retry";
const AUTO_RETRY_MS = 2500;

/** Recover once from transient player errors; then show readable cause in-player. */
export default function WatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    console.error("[watch] error:", error);

    const lastRetry = Number(sessionStorage.getItem(WATCH_RETRY_KEY) || 0);
    const now = Date.now();

    if (now - lastRetry > AUTO_RETRY_MS) {
      sessionStorage.setItem(WATCH_RETRY_KEY, String(now));
      reset();
      return;
    }

    sessionStorage.removeItem(WATCH_RETRY_KEY);
    setShowError(true);
  }, [error, reset]);

  if (!showError) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center rounded-xl border border-white/10">
        <LoadingGirl size={160} label={t("watch.loadingStream")} />
      </div>
    );
  }

  return <WatchErrorPanel error={error} onRetry={() => reset()} />;
}
