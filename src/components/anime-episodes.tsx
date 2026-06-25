"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
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

type Props = {
  animeId: string;
};

const AnimeEpisodes = ({ animeId }: Props) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [ranges, setRanges] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>("");
  const [query, setQuery] = useState("");

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
      allEpisodes.filter((ep, idx) =>
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

      {/* Grid */}
      <div className="grid lg:grid-cols-5 grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 gap-3 content-center">
        {episodes.map((episode, idx) => (
          <EpisodeCard
            episode={episode}
            key={idx}
            className="self-center justify-self-center"
            animeId={animeId}
          />
        ))}
        {!episodes.length && !isLoading && (
          <div className={cn(
            "lg:col-span-5 col-span-4 sm:col-span-5 md:col-span-6 xl:col-span-8 2xl:col-span-9",
            "flex items-center justify-center py-16 rounded-xl bg-white/3 border border-white/6",
          )}>
            <p className="text-white/25 text-sm font-mono">No episodes found</p>
          </div>
        )}
        {isLoading &&
          Array.from({ length: 18 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-lg w-full aspect-[3/2] animate-pulse bg-white/6 self-center justify-self-center"
            />
          ))}
      </div>
    </div>
  );
};

export default AnimeEpisodes;
