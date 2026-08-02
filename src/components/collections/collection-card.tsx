"use client";

import Link from "next/link";
import { Eye, Heart, Library, Users } from "lucide-react";
import { CollectionCover } from "./collection-cover";
import {
  COLLECTION_CATEGORY_LABELS,
  collectionPath,
  formatCount,
  type CollectionCategory,
  type CollectionSummary,
} from "@/lib/collections/collection-shared";

type Props = {
  collection: CollectionSummary;
  /** Shown on the owner's own management list. */
  showVisibility?: boolean;
};

const VISIBILITY_LABEL: Record<string, string> = {
  private: "Private",
  unlisted: "Unlisted",
  public: "Public",
};

export function CollectionCard({ collection: c, showVisibility = false }: Props) {
  const categoryLabel = c.category
    ? COLLECTION_CATEGORY_LABELS[c.category as CollectionCategory] ?? c.category
    : null;

  return (
    <Link
      href={collectionPath(c.id, c.slug)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] transition-colors hover:border-border dark:hover:border-white/20"
    >
      <CollectionCover
        coverType={c.coverType}
        coverValue={c.coverValue}
        icon={c.icon}
        thumbnails={c.previewThumbnails}
        className="aspect-[16/9] w-full"
      />

      {c.isFeatured && (
        <span className="absolute right-2.5 top-2.5 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-black">
          {c.featuredLabel || "Featured"}
        </span>
      )}
      {showVisibility && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
          {VISIBILITY_LABEL[c.visibility] ?? c.visibility}
        </span>
      )}

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground dark:text-white/90">
          {c.title}
        </h3>
        {c.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground dark:text-white/40">
            {c.description}
          </p>
        )}

        <div className="mt-auto pt-3">
          {categoryLabel && (
            <span className="inline-block rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground dark:text-white/45">
              {categoryLabel}
            </span>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums text-muted-foreground dark:text-white/35">
            <span className="inline-flex items-center gap-1">
              <Library className="h-3 w-3" />
              {formatCount(c.itemCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatCount(c.likeCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatCount(c.followerCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatCount(c.viewCount)}
            </span>
          </div>
          {c.ownerUsername && (
            <p className="mt-2 truncate text-[11px] text-muted-foreground dark:text-white/30">
              by {c.ownerUsername}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
