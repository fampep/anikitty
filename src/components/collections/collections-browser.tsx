"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Flame,
  Gem,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/core/utils";
import { CollectionCard } from "./collection-card";
import { CollectionEditorDialog } from "./collection-editor-dialog";
import {
  COLLECTION_CATEGORIES,
  COLLECTION_CATEGORY_LABELS,
  type CollectionSummary,
} from "@/lib/collections/collection-shared";

const SORTS = [
  { id: "trending", label: "Trending", Icon: Flame },
  { id: "most-liked", label: "Most Liked", Icon: Star },
  { id: "most-followed", label: "Most Followed", Icon: Users },
  { id: "recent", label: "Recent", Icon: Sparkles },
  { id: "growing", label: "Fastest Growing", Icon: TrendingUp },
  { id: "featured", label: "Staff Picks", Icon: Target },
  { id: "hidden-gems", label: "Hidden Gems", Icon: Gem },
] as const;

export function CollectionsBrowser() {
  const { auth } = useAuthStore();
  const [sort, setSort] = useState<string>("trending");
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<CollectionSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const load = useCallback(
    async (p: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ sort, page: String(p) });
        if (category) params.set("category", category);
        if (debounced) params.set("q", debounced);
        const res = await fetch(`/api/collections/discover?${params}`, withAuth());
        const data = await res.json();
        const incoming: CollectionSummary[] = data.collections ?? [];
        setItems((prev) => (append ? [...prev, ...incoming] : incoming));
        setHasMore(!!data.hasMore);
        setPage(p);
      } catch {
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sort, category, debounced],
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground dark:text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search collections…"
            className="w-full rounded-xl border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        {auth && (
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary/15 px-3.5 py-2 text-xs font-bold text-primary ring-1 ring-primary/25 transition-colors hover:bg-primary/25"
          >
            <Plus className="h-3.5 w-3.5" />
            New collection
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSort(s.id)}
            aria-pressed={sort === s.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
              sort === s.id
                ? "bg-accent dark:bg-white/12 text-foreground dark:text-white"
                : "text-muted-foreground dark:text-white/35 hover:text-foreground dark:hover:text-white/70",
            )}
          >
            <s.Icon className="h-3 w-3" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors",
            category === null
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground dark:text-white/30 hover:text-foreground dark:hover:text-white/60",
          )}
        >
          All
        </button>
        {COLLECTION_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory((prev) => (prev === c ? null : c))}
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors",
              category === c
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground dark:text-white/30 hover:text-foreground dark:hover:text-white/60",
            )}
          >
            {COLLECTION_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl border border-border/60 dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02]"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border dark:border-white/[0.09] py-14 text-center">
          <p className="text-sm text-muted-foreground dark:text-white/40">
            No collections here yet.
          </p>
          {auth && (
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="mt-3 rounded-lg border border-border dark:border-white/10 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground dark:text-white/60 transition-colors hover:text-foreground dark:hover:text-white/85"
            >
              Be the first to make one
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void load(page + 1, true)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-border dark:border-white/10 px-4 py-2 text-xs font-semibold text-muted-foreground dark:text-white/60 transition-colors hover:text-foreground dark:hover:text-white/85 disabled:opacity-40"
              >
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}

      <CollectionEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          void load(1, false);
        }}
      />
    </div>
  );
}
