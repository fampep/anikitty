"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

/** Fixed strip when the browser reports offline — pairs with the SW /offline page. */
export default function NetworkOfflineBanner() {
  const t = useT();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 top-[var(--nav-total-height)] z-[95] flex justify-center px-3 pt-2 pointer-events-none",
      )}
    >
      <div className="pointer-events-auto inline-flex max-w-lg items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-950/90 px-3 py-2 text-[12px] font-medium text-amber-100 shadow-lg backdrop-blur-md">
        <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{t("network.offlineBanner")}</span>
      </div>
    </div>
  );
}
