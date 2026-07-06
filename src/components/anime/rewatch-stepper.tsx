"use client";

import { useEffect, useState } from "react";
import { Repeat, Minus, Plus } from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";

/** Compact +/- control for the MAL-style rewatch counter on a completed title. */
export default function RewatchStepper({
  animeId,
  initial,
}: {
  animeId: string;
  initial: number;
}) {
  const [count, setCount] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCount(initial);
  }, [initial]);

  const bump = async (delta: number) => {
    if (busy) return;
    const next = Math.max(0, count + delta);
    if (next === count) return;
    setBusy(true);
    setCount(next); // optimistic
    try {
      const res = await fetch(
        `/api/account/watchlist/${encodeURIComponent(animeId)}`,
        withAuth({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rewatchDelta: delta }),
        }),
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (typeof data.rewatchCount === "number") setCount(data.rewatchCount);
    } catch {
      setCount(count); // revert
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-2 py-1.5 text-cyan-200/90">
      <Repeat className="w-3.5 h-3.5 shrink-0" />
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={busy || count === 0}
        aria-label="Decrease rewatches"
        className="flex h-5 w-5 items-center justify-center rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="min-w-[2.5rem] text-center text-xs font-bold tabular-nums">
        {count} {count === 1 ? "rewatch" : "rewatches"}
      </span>
      <button
        type="button"
        onClick={() => bump(1)}
        disabled={busy}
        aria-label="Increase rewatches"
        className="flex h-5 w-5 items-center justify-center rounded hover:bg-white/10 disabled:opacity-30 transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
