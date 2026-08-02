"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, MessageSquare, Popcorn, Users } from "lucide-react";
import Container from "@/components/layout/container";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type LiveStats = {
  online: number;
  episodesToday: number;
  totalUsers: number;
  commentsToday: number;
};

/** Eases a counter toward its new value so refreshes don't snap. */
function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return value;
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const animated = useCountUp(value);
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
      <span className="shrink-0 text-muted-foreground dark:text-white/40">{icon}</span>
      <span className="min-w-0">
        <span className="block font-mono text-base font-bold tabular-nums leading-none text-foreground dark:text-white/90">
          {animated.toLocaleString()}
        </span>
        <span className="mt-1 block text-[10px] text-muted-foreground dark:text-white/30">
          {label}
        </span>
      </span>
    </div>
  );
}

export default function HomeLiveStats({ className }: { className?: string }) {
  const t = useT();
  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Skip refreshes for a backgrounded tab — nobody is watching the numbers.
      if (document.hidden) return;
      try {
        const res = await fetch("/api/stats/live");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch {
        // Ticker is decorative; a failed poll just leaves the last values.
      }
    };

    void load();
    const id = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!stats) return null;

  return (
    <Container className={cn("py-0", className)}>
      <div className="site-panel grid grid-cols-2 gap-1 rounded-2xl p-2 sm:grid-cols-4">
        <StatTile
          icon={<Eye className="h-4 w-4" />}
          label={t("home.liveWatching")}
          value={stats.online}
        />
        <StatTile
          icon={<Popcorn className="h-4 w-4" />}
          label={t("home.liveEpisodesToday")}
          value={stats.episodesToday}
        />
        <StatTile
          icon={<Users className="h-4 w-4" />}
          label={t("home.liveMembers")}
          value={stats.totalUsers}
        />
        <StatTile
          icon={<MessageSquare className="h-4 w-4" />}
          label={t("home.liveCommentsToday")}
          value={stats.commentsToday}
        />
      </div>
    </Container>
  );
}
