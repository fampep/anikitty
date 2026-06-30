"use client";

import { useEffect, useRef } from "react";
import LoadingGirl from "@/components/common/loading-girl";
import { useT } from "@/providers/i18n-provider";

/** Recover once from transient player errors instead of looping the error boundary. */
export default function WatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  const retriedRef = useRef(false);

  useEffect(() => {
    console.error("[watch] error:", error);
    if (retriedRef.current) return;
    retriedRef.current = true;
    reset();
  }, [error, reset]);

  return (
    <div className="w-full aspect-video bg-black flex items-center justify-center rounded-xl border border-white/10">
      <LoadingGirl size={160} label={t("watch.loadingStream")} />
    </div>
  );
}
