"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search, X, Loader2, ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { GifImage } from "@/components/shared/gif-image";
import type { GiphyResult } from "@/app/api/giphy/search/route";

/**
 * Giphy-powered GIF picker modal. Pops out over the page: trending on open,
 * debounced Giphy search, tap-to-attach grid. Search is proxied through
 * /api/giphy/search so the API key stays server-side. Keeps the onAttach/onClose
 * contract so existing call sites (comments, chat) work unchanged.
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  // Debounced search (trending when empty).
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/giphy/search?q=${encodeURIComponent(query.trim())}&limit=30`,
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

  const attach = (url: string) => {
    onAttach(url);
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          // Focus the search box instead of the first GIF.
          e.preventDefault();
          inputRef.current?.focus();
        }}
        className="max-w-xl w-[calc(100%-1.5rem)] p-0 gap-0 overflow-hidden sm:rounded-2xl bg-[#0a0a0a] dark:bg-[#0a0a0a] border-white/10"
      >
        <DialogTitle className="sr-only">Search GIFs</DialogTitle>

        {/* Search bar (right padding reserves room for the dialog's close ✕) */}
        <div className="flex items-center gap-2.5 pl-4 pr-11 py-3.5 border-b border-white/8">
          <Search className="w-4 h-4 text-white/35 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs on GIPHY…"
            className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="text-white/30 hover:text-white/70 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results grid */}
        <div className="h-[min(60vh,26rem)] overflow-y-auto scrollbar-thin p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white/25" />
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center px-6">
              <ImageOff className="w-8 h-8 text-white/15" />
              <p className="text-sm text-white/40">GIF search is unavailable right now.</p>
              <p className="text-xs text-white/25">Please try again in a moment.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center px-6">
              <Search className="w-8 h-8 text-white/15" />
              <p className="text-sm text-white/40">No GIFs found for “{query.trim()}”.</p>
              <p className="text-xs text-white/25">Try a different search.</p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 gap-3 [column-fill:_balance]">
              {results.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => attach(g.url)}
                  title={g.title}
                  className="mb-3 block w-full overflow-hidden rounded-xl ring-1 ring-white/8 hover:ring-2 hover:ring-white/70 focus:outline-none focus:ring-2 focus:ring-white/70 transition-all"
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

        {/* Attribution */}
        <div className="px-4 py-2.5 border-t border-white/8">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/20">
            Powered by GIPHY
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
