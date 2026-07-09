"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useSettingsStore } from "@/store/settings-store";

/** Floating "back to top" button that appears after scrolling down a page. */
export default function ScrollToTop() {
  const t = useT();
  const reducedMotion = usePrefersReducedMotion();
  const liteMode = useSettingsStore((s) => s.liteMode);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setVisible(window.scrollY > 700);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label={t("common.backToTop")}
      title={t("common.backToTop")}
      onClick={() =>
        window.scrollTo({ top: 0, behavior: reducedMotion || liteMode ? "instant" : "smooth" })
      }
      className={cn(
        "fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full",
        "border border-border dark:border-white/12 bg-black/70 text-white backdrop-blur-sm shadow-lg shadow-black/40",
        "hover:bg-violet-500/80 hover:border-violet-400/40 transition-all",
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none",
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
