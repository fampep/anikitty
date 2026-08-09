"use client";

import { useEffect, useState } from "react";
import { Play, Star, MessageCircle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { HistoryBarChart } from "@/components/history/history-charts";

type EpisodeStatRow = {
  episode: number;
  plays: number;
  completions: number;
  completionRate: number;
  avgRating: number | null;
  ratingCount: number;
  comments: number;
};

type Response = {
  episodes: EpisodeStatRow[];
  highlights: {
    mostWatched: number | null;
    highestRated: number | null;
    mostDiscussed: number | null;
  };
};

async function fetchEpisodeStats(animeId: string): Promise<Response> {
  const res = await fetch(`/api/anime/${animeId}/episode-stats`);
  if (!res.ok) throw new Error("Failed to load episode stats");
  return res.json();
}

function Highlight({
  icon: Icon,
  label,
  episode,
  detail,
}: {
  icon: typeof Play;
  label: string;
  episode: number | null;
  detail?: string;
}) {
  if (episode == null) return null;
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.03] px-3.5 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground dark:text-white/45">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground dark:text-white">
          Episode {episode}
          {detail ? <span className="ml-1.5 font-normal text-muted-foreground dark:text-white/50">{detail}</span> : null}
        </p>
      </div>
    </div>
  );
}

export default function EpisodePopularity({ animeId }: { animeId: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["episode-popularity", animeId],
    queryFn: () => fetchEpisodeStats(animeId),
    enabled: mounted,
    staleTime: 5 * 60_000,
  });

  const episodes = data?.episodes ?? [];
  const hasAnyPlays = episodes.some((e) => e.plays > 0);

  if (mounted && !isLoading && !hasAnyPlays) return null;

  const byEp = new Map(episodes.map((e) => [e.episode, e]));
  const highest = data?.highlights.highestRated != null ? byEp.get(data.highlights.highestRated) : undefined;
  const mostWatched = data?.highlights.mostWatched != null ? byEp.get(data.highlights.mostWatched) : undefined;
  const mostDiscussed = data?.highlights.mostDiscussed != null ? byEp.get(data.highlights.mostDiscussed) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground dark:text-white/85">
        <TrendingUp className="h-4 w-4 text-primary" />
        Episode Popularity
      </h3>

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.02]" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Highlight
              icon={Play}
              label="Most Watched"
              episode={data?.highlights.mostWatched ?? null}
              detail={mostWatched ? `${mostWatched.plays} plays` : undefined}
            />
            <Highlight
              icon={Star}
              label="Highest Rated"
              episode={data?.highlights.highestRated ?? null}
              detail={highest?.avgRating != null ? `${highest.avgRating}★` : undefined}
            />
            <Highlight
              icon={MessageCircle}
              label="Most Discussed"
              episode={data?.highlights.mostDiscussed ?? null}
              detail={mostDiscussed ? `${mostDiscussed.comments} comments` : undefined}
            />
          </div>

          {episodes.length > 1 && (
            <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.03] p-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground dark:text-white/45">
                Plays per episode
              </p>
              <HistoryBarChart
                data={episodes.map((e) => ({ label: `E${e.episode}`, value: e.plays }))}
                barClassName="fill-primary/70"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
