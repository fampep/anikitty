"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export default function ProfileBackToTop({ className }: { className?: string }) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("profile.hub.backToTop")}
      className={cn(
        "fixed bottom-6 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border dark:border-white/15 bg-background/90 dark:bg-[#0c0c0c]/90 text-foreground/80 dark:text-white/80 shadow-lg shadow-black/30 backdrop-blur-md transition hover:bg-accent dark:hover:bg-white/10 sm:bottom-8 sm:right-8",
        className,
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
