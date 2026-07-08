"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, Link2, ImageOff } from "lucide-react";
import { GifImage } from "@/components/shared/gif-image";
import type { GiphyResult } from "@/app/api/giphy/search/route";
import { cn } from "@/lib/core/utils";

/**
 * Giphy-powered GIF picker. Searches Giphy (server-proxied so the API key stays
 * server-side), shows trending on empty query, and falls back to pasting a
 * direct URL. Drop-in replacement for GifUrlPanel: same onAttach/onClose props.
 */
export function GifPickerPanel({
  onAttach,
  onClose,
}: {
  onAttach: (url: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [url, setUrl] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click.
  useEffect(() => {
    inputRef.current?.focus();
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Debounced search (trending when empty).
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/giphy/search?q=${encodeURIComponent(query.trim())}&limit=24`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as { results?: GiphyResult[]; error?: string };
        if (cancelled) return;
        setResults(data.results ?? []);
        setError(!!data.error);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query.trim() ? 350 : 0);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const urlValid = url.trim().startsWith("http");

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full mb-2 left-0 z-50 w-[19rem] sm:w-80 rounded-xl border border-border dark:border-white/10 bg-popover dark:bg-[#0d0d0d] shadow-2xl shadow-black/80 overflow-hidden"
    >
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border dark:border-white/6">
        <Search className="w-3.5 h-3.5 text-muted-foreground/70 dark:text-white/30 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs"
          className="flex-1 min-w-0 bg-transparent text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/25 outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="text-muted-foreground/60 dark:text-white/25 hover:text-muted-foreground dark:hover:text-white/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="h-64 overflow-y-auto scrollbar-thin p-2">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50 dark:text-white/25" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
            <ImageOff className="w-6 h-6 text-muted-foreground/40 dark:text-white/15" />
            <p className="text-xs text-muted-foreground/70 dark:text-white/30">
              GIF search is unavailable right now.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
            <Search className="w-6 h-6 text-muted-foreground/40 dark:text-white/15" />
            <p className="text-xs text-muted-foreground/70 dark:text-white/30">
              No GIFs found for “{query.trim()}”.
            </p>
          </div>
        ) : (
          <div className="columns-2 gap-2 [column-fill:_balance]">
            {results.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  onAttach(g.url);
                  onClose();
                }}
                title={g.title}
                className="mb-2 block w-full overflow-hidden rounded-lg ring-1 ring-border dark:ring-white/8 hover:ring-2 hover:ring-violet-400/60 transition-all focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                style={{ aspectRatio: `${g.width} / ${g.height}` }}
              >
                <GifImage
                  src={g.preview}
                  alt={g.title}
                  className="w-full h-full object-cover block bg-white/5"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer: attribution + paste-URL fallback */}
      <div className="border-t border-border dark:border-white/6">
        {showUrl ? (
          <div className="flex items-center gap-2 px-3 py-2.5">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && urlValid) {
                  onAttach(url.trim());
                  onClose();
                }
              }}
              placeholder="https://media.giphy.com/…"
              className="flex-1 min-w-0 bg-muted/50 dark:bg-white/5 border border-border dark:border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 outline-none focus:border-white/22 transition-colors"
            />
            <button
              type="button"
              onClick={() => urlValid && (onAttach(url.trim()), onClose())}
              disabled={!urlValid}
              className="px-2.5 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
            >
              Add
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50 dark:text-white/20">
              Powered by GIPHY
            </span>
            <button
              type="button"
              onClick={() => setShowUrl(true)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70 dark:text-white/30",
                "hover:text-muted-foreground dark:hover:text-white/60 transition-colors",
              )}
            >
              <Link2 className="w-3 h-3" />
              Paste link
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
