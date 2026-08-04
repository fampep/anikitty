"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGetAnimeRelated } from "@/query/anime/get-anime-related";
import { cn } from "@/lib/core/utils";

type RelationType = "Prequel" | "Sequel" | "SideStory" | "SpinOff" | "Alternative" | "Summary";

export default function WatchRecommendationsSidebar() {
  const searchParams = useSearchParams();
  const animeId = searchParams.get("anime");

  const { data: related } = useGetAnimeRelated(animeId ?? "");

  const prequel = related?.relations?.filter((r) => r.relationType === "Prequel") ?? [];
  const sequel = related?.relations?.filter((r) => r.relationType === "Sequel") ?? [];
  const similar = related?.recommendations?.slice(0, 4) ?? [];

  return (
    <div className="divide-y divide-border/30 dark:divide-white/5">
      {/* Prequel Section */}
      {prequel.length > 0 && (
        <div className="p-4">
          <h4 className="text-xs font-semibold text-foreground/80 dark:text-white/60 uppercase tracking-wider mb-3">
            Prequel
          </h4>
          <div className="space-y-2">
            {prequel.map((item) => (
              <Link
                key={item.id}
                href={`/anime/${encodeURIComponent(item.id)}`}
                className="flex gap-2 hover:opacity-80 transition"
              >
                <div className="relative h-12 w-9 shrink-0 rounded overflow-hidden bg-muted/30 dark:bg-white/5">
                  {item.poster ? (
                    <Image
                      src={item.poster}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/50 dark:bg-white/5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground/80 dark:text-white/80 line-clamp-2">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground dark:text-white/50 mt-0.5">
                    {item.year}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sequel Section */}
      {sequel.length > 0 && (
        <div className="p-4">
          <h4 className="text-xs font-semibold text-foreground/80 dark:text-white/60 uppercase tracking-wider mb-3">
            Sequel
          </h4>
          <div className="space-y-2">
            {sequel.map((item) => (
              <Link
                key={item.id}
                href={`/anime/${encodeURIComponent(item.id)}`}
                className="flex gap-2 hover:opacity-80 transition"
              >
                <div className="relative h-12 w-9 shrink-0 rounded overflow-hidden bg-muted/30 dark:bg-white/5">
                  {item.poster ? (
                    <Image
                      src={item.poster}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/50 dark:bg-white/5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground/80 dark:text-white/80 line-clamp-2">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground dark:text-white/50 mt-0.5">
                    {item.year}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* More Like This Section */}
      {similar.length > 0 && (
        <div className="p-4">
          <h4 className="text-xs font-semibold text-foreground/80 dark:text-white/60 uppercase tracking-wider mb-3">
            More like this
          </h4>
          <div className="space-y-2">
            {similar.map((item) => (
              <Link
                key={item.id}
                href={`/anime/${encodeURIComponent(item.id)}`}
                className="flex gap-2 hover:opacity-80 transition"
              >
                <div className="relative h-12 w-9 shrink-0 rounded overflow-hidden bg-muted/30 dark:bg-white/5">
                  {item.poster ? (
                    <Image
                      src={item.poster}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-muted/50 dark:bg-white/5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground/80 dark:text-white/80 line-clamp-2">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground dark:text-white/50 mt-0.5">
                    {item.type} • {item.year}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
