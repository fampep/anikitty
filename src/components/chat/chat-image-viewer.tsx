"use client";

import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { gifDisplayUrl } from "@/lib/core/gif-url";
import { cn } from "@/lib/core/utils";

export function ChatImageViewer({
  urls,
  index,
  onClose,
  onIndexChange,
  alt,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  alt: string;
}) {
  const src = urls[index];
  const display = gifDisplayUrl(src);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange(Math.max(0, index - 1));
      if (e.key === "ArrowRight") onIndexChange(Math.min(urls.length - 1, index + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, urls.length, onClose, onIndexChange]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div className="absolute top-3 right-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <a
          href={display}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
        >
          <Download className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {urls.length > 1 && (
        <>
          <button
            type="button"
            disabled={index <= 0}
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(index - 1);
            }}
            className={cn(
              "absolute left-3 p-2 rounded-full bg-white/10 text-white disabled:opacity-30",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={index >= urls.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(index + 1);
            }}
            className="absolute right-3 p-2 rounded-full bg-white/10 text-white disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={display}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] max-w-[92vw] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
      />
    </div>
  );
}
