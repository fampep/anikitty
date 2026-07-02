"use client";

import Image from "next/image";
import { cn } from "@/lib/core/utils";

type Props = {
  posters: string[];
  loaded: boolean;
};

export default function LandingPosterWall({ posters, loaded }: Props) {
  const tiles = Array.from({ length: 12 }, (_, i) => posters[i % Math.max(posters.length, 1)]);

  return (
    <div
      className={cn(
        "absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none pointer-events-none select-none",
        loaded && posters.length > 0 ? "opacity-100" : "opacity-0",
      )}
      aria-hidden
    >
      <div className="grid grid-cols-3 sm:grid-cols-6 h-full gap-1 sm:gap-1.5">
        {tiles.map((src, i) =>
          src ? (
            <div
              key={i}
              className="relative overflow-hidden rounded-md aspect-[2/3] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700"
              style={loaded ? { animationDelay: `${i * 60}ms`, animationFillMode: "backwards" } : undefined}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover saturate-[0.55] brightness-[0.65]"
                loading={i < 6 ? "eager" : "lazy"}
                sizes="(max-width: 640px) 33vw, 16vw"
              />
            </div>
          ) : (
            <div key={i} className="bg-white/[0.02] rounded-md aspect-[2/3]" />
          ),
        )}
      </div>
      <div className="absolute inset-0 bg-black/25 sm:bg-black/20 sm:backdrop-blur-[2px]" />
    </div>
  );
}
