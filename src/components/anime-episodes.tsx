"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { LayoutGrid, List, Search } from "lucide-react";
import EpisodeCard from "./common/episode-card";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import { Episode } from "@/types/episodes";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type ViewMode = "thumbnail" | "list";

type Props = {
  animeId: string;
};

const AnimeEpisodes = ({ animeId }: Props) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [ranges, setRanges] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("thumbnail");

  const { data, isLoading } = useGetAllEpisodes(animeId);

  useEffect(() => {
    if (data) {
      const eps = data.episodes;
      setAllEpisodes(eps);

      if (eps.length > 50) {
        const rangesArray: string[] = [];
        for (let i = 0; i < eps.length; i += 50) {
          rangesArray.push(`${i + 1}-${Math.min(i + 50, eps.length)}`);
        }
        setRanges(rangesArray);
        setSelectedRange(rangesArray[0]);
        setEpisodes(eps.slice(0, 50));
      } else {
        setEpisodes(eps);
      }
    }
  }, [data]);

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
    setQuery("");
    const [start, end] = range.split("-").map(Number);
    setEpisodes(allEpisodes.slice(start - 1, end));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (!q.trim()) {
      const [start, end] = (selectedRange || "1-50").split("-").map(Number);
      setEpisodes(allEpisodes.slice(start - 1, end));
      return;
    }
    const lower = q.toLowerCase();
    setEpisodes(
      allEpisodes.filter(
        (ep, idx) =>
          (idx + 1).toString().includes(lower) ||
          ep.title.toLowerCase().includes(lower) ||
          "episode".includes(lower.trim()),
      ),
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
          {allEpisodes.length > 0 ? `${allEpisodes.length} Episodes` : "Episodes"}
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg border border-white/8 p-0.5">
            <button
              onClick={() => setView("thumbnail")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === "thumbnail"
                  ? "bg-white/10 text-white/80"
                  : "text-white/30 hover:text-white/55",
              )}
              title="Thumbnail view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === "list"
                  ? "bg-white/10 text-white/80"
                  : "text-white/30 hover:text-white/55",
              )}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {ranges.length > 0 && (
            <Select onValueChange={handleRangeChange} value={selectedRange}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-white/4 border-white/10 text-white/65 hover:bg-white/7 transition-colors">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent className="bg-[#0e0e0e] border-white/10">
                <SelectGroup>
                  {ranges.map((range) => (
                    <SelectItem key={range} value={range} className="text-xs text-white/70">
                      {range}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}

          <div className="relative">
            <Search className="absolute inset-y-0 left-2.5 m-auto h-3.5 w-3.5 text-white/30 pointer-events-none" />
            <input
              value={query}
              placeholder="Search episode…"
              onChange={handleSearch}
              className="h-8 pl-8 pr-3 text-xs rounded-lg bg-white/4 border border-white/10 text-white/75 placeholder:text-white/25 outline-none focus:border-white/25 focus:bg-white/7 transition-all w-44"
            />
          </div>
        </div>
      </div>

      {/* Episode grid / list */}
      {view === "thumbnail" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {episodes.map((episode, idx) => (
            <EpisodeCard
              key={idx}
              episode={episode}
              animeId={animeId}
              variant="thumbnail"
            />
          ))}
          {!episodes.length && !isLoading && <EmptyState colSpan="col-span-2 sm:col-span-3 md:col-span-4 xl:col-span-5" />}
          {isLoading && <ThumbnailSkeletons />}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {episodes.map((episode, idx) => (
            <EpisodeCard
              key={idx}
              episode={episode}
              animeId={animeId}
              variant="list"
            />
          ))}
          {!episodes.length && !isLoading && <EmptyState colSpan="" />}
          {isLoading && <ListSkeletons />}
        </div>
      )}
    </div>
  );
};

function EmptyState({ colSpan }: { colSpan: string }) {
  return (
    <div
      className={cn(
        colSpan,
        "flex items-center justify-center py-16 rounded-xl bg-white/3 border border-white/6",
      )}
    >
      <p className="text-white/25 text-sm font-mono">No episodes found</p>
    </div>
  );
}

function ThumbnailSkeletons() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-white/6" />
          <div className="h-8 bg-white/4 mt-0.5" />
        </div>
      ))}
    </>
  );
}

function ListSkeletons() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-0 rounded-xl overflow-hidden animate-pulse h-[60px]">
          <div className="w-[108px] shrink-0 bg-white/6" />
          <div className="flex-1 bg-white/4 ml-0.5" />
        </div>
      ))}
    </>
  );
}

export default AnimeEpisodes;
