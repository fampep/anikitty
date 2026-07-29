"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export default function AnimeBackToTop({ className }: { className?: string }) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("anime.backToTop")}
      title={t("anime.backToTop")}
      className={cn(
        "fixed bottom-[calc(var(--mobile-nav-total,0px)+1.25rem)] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/80 text-white/90 shadow-lg shadow-black/40 backdrop-blur-sm hover:bg-white/10 hover:border-white/25 transition-all sm:bottom-6",
        className,
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
