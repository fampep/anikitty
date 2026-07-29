"use client";

import Link from "next/link";

export function EpisodeCountBadge({ count, username }: { count: number; username?: string }) {
  if (count <= 0) return null;

  const formatted = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);

  const badge = (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-white/5 border border-white/10 text-white/60 hover:text-white/80 transition-colors">
      <span>📺</span>
      <span>{formatted} eps</span>
    </span>
  );

  if (username) {
    return (
      <Link href={`/profile/${username}?tab=stats`} className="inline-flex">
        {badge}
      </Link>
    );
  }

  return badge;
}
