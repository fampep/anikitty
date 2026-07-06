"use client";

import { useState } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

/** Hover "+" on anime cards to add to the watchlist without opening the page. */
export default function QuickAddButton({
  animeId,
  title,
  poster,
}: {
  animeId: string;
  title: string;
  poster: string;
}) {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const [state, setState] = useState<"idle" | "loading" | "added">("idle");

  if (!auth) return null;

  const add = async (e: React.MouseEvent) => {
    // Card is a <Link> — don't navigate when tapping the button.
    e.preventDefault();
    e.stopPropagation();
    if (state !== "idle") return;
    setState("loading");
    try {
      const res = await fetch(
        "/api/account/watchlist",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            animeId,
            folder: "PLANNING",
            anilistId: parseInt(animeId, 10) || undefined,
            animeTitle: title,
            animeThumbnail: poster,
          }),
        }),
      );
      if (!res.ok) throw new Error();
      setState("added");
      toast.success(t("anime.addedToPlanToWatch"));
    } catch {
      setState("idle");
      toast.error(t("anime.listError"));
    }
  };

  return (
    <button
      type="button"
      onClick={add}
      aria-label={t("anime.addToPlanToWatch")}
      title={t("anime.addToPlanToWatch")}
      className={cn(
        "absolute top-2 right-2 z-30 flex h-7 w-7 items-center justify-center rounded-full ring-1 transition-all",
        "opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100",
        state === "added"
          ? "bg-emerald-500/85 text-white ring-emerald-300/40 opacity-100"
          : "bg-black/55 text-white ring-white/25 hover:bg-violet-500/85 hover:ring-violet-300/40",
      )}
    >
      {state === "loading" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === "added" ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Plus className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
