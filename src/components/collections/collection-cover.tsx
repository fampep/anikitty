"use client";

import { cn } from "@/lib/core/utils";
import { CollectionIconGlyph } from "./collection-icon";
import {
  COLLECTION_GRADIENTS,
  type CollectionCoverType,
} from "@/lib/collections/collection-shared";

type Props = {
  coverType: CollectionCoverType;
  coverValue: string | null;
  icon?: string | null;
  thumbnails?: string[];
  className?: string;
};

/**
 * Renders a collection's cover. Collage falls back to a gradient when the
 * collection has no posters yet, so empty lists still look deliberate.
 */
export function CollectionCover({
  coverType,
  coverValue,
  icon,
  thumbnails = [],
  className,
}: Props) {
  const gradient =
    COLLECTION_GRADIENTS.find((g) => g.id === coverValue)?.css ?? COLLECTION_GRADIENTS[0].css;

  const inner = (() => {
    if (coverType === "image" && coverValue) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverValue}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      );
    }
    if (coverType === "solid") {
      return (
        <div
          className="absolute inset-0"
          style={{ background: coverValue || "#18181b" }}
        />
      );
    }
    if (coverType === "collage" && thumbnails.length > 0) {
      return (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {Array.from({ length: 4 }).map((_, i) => {
            const src = thumbnails[i % thumbnails.length];
            return src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div key={i} className="h-full w-full bg-white/5" />
            );
          })}
        </div>
      );
    }
    return <div className="absolute inset-0" style={{ background: gradient }} />;
  })();

  return (
    <div className={cn("relative overflow-hidden bg-zinc-900", className)}>
      {inner}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <CollectionIconGlyph
        name={icon}
        className="absolute left-2.5 top-2.5 h-4 w-4 text-white/90 drop-shadow-md"
      />
    </div>
  );
}
