"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export type GalleryItem = {
  image: string;
  thumbnail?: string;
  title?: string;
  sourceUrl?: string;
  group?: string;
};

type Props = {
  sections: { label: string; items: GalleryItem[]; wide?: boolean; transparent?: boolean }[];
};

export default function AnimeGallery({ sections }: Props) {
  const t = useT();
  const flat = useMemo(
    () =>
      sections.flatMap((s) =>
        s.items.map((item) => ({ ...item, group: item.group ?? s.label, wide: s.wide, transparent: s.transparent })),
      ),
    [sections],
  );
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const close = useCallback(() => setViewerIndex(null), []);
  const prev = useCallback(() => {
    setViewerIndex((i) => (i == null ? i : (i - 1 + flat.length) % flat.length));
  }, [flat.length]);
  const next = useCallback(() => {
    setViewerIndex((i) => (i == null ? i : (i + 1) % flat.length));
  }, [flat.length]);

  useEffect(() => {
    if (viewerIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [viewerIndex, close, prev, next]);

  if (sections.every((s) => s.items.length === 0)) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
        {t("anime.gallery.empty")}
      </p>
    );
  }

  let runningIndex = 0;

  return (
    <>
      <div className="space-y-10">
        {sections.map((section) => {
          if (section.items.length === 0) return null;
          const start = runningIndex;
          runningIndex += section.items.length;
          return (
            <div key={section.label}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest">
                  {section.label}
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground/50 dark:text-white/15">
                  {section.items.length}
                </span>
              </div>
              <div
                className={cn(
                  "grid gap-3",
                  section.wide
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                )}
              >
                {section.items.map((item, i) => {
                  const flatIndex = start + i;
                  return (
                    <button
                      key={`${section.label}-${i}`}
                      type="button"
                      onClick={() => setViewerIndex(flatIndex)}
                      className={cn(
                        "group relative rounded-xl overflow-hidden ring-1 ring-white/8 hover:ring-white/25 transition-all text-left",
                        section.wide ? "aspect-[16/9]" : "aspect-[2/3]",
                        section.transparent && "bg-muted/50 dark:bg-white/5",
                      )}
                    >
                      <Image
                        src={item.thumbnail ?? item.image}
                        alt={item.title ?? `${section.label} ${i + 1}`}
                        fill
                        unoptimized
                        loading="lazy"
                        sizes={section.wide ? "(max-width: 640px) 100vw, 33vw" : "(max-width: 640px) 50vw, 20vw"}
                        className={cn(
                          "object-cover transition-transform duration-300 group-hover:scale-105",
                          section.transparent && "object-contain p-4",
                        )}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
                        <span className="text-[11px] font-mono text-foreground/90 dark:text-white/80 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border dark:border-white/15 max-w-[90%] truncate">
                          {item.title ?? t("anime.fullSize")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {viewerIndex != null && flat[viewerIndex] && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("anime.gallery.viewer")}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/90 hover:bg-white/10"
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" />
          </button>
          {flat.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 sm:left-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/90 hover:bg-white/10"
                aria-label={t("anime.gallery.prev")}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 sm:right-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/90 hover:bg-white/10"
                aria-label={t("anime.gallery.next")}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <div
            className="relative max-h-[85vh] max-w-[min(96vw,1100px)] w-full aspect-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[min(85vh,800px)]">
              <Image
                src={flat[viewerIndex].image}
                alt={flat[viewerIndex].title ?? t("anime.fullSize")}
                fill
                unoptimized
                className="object-contain"
                sizes="96vw"
                priority
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-mono text-white/50">
              <span className="truncate">{flat[viewerIndex].group}</span>
              <span>
                {viewerIndex + 1} / {flat.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
