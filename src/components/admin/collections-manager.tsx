"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { collectionPath, formatCount } from "@/lib/collections/collection-shared";
import type { CollectionSummary } from "@/lib/collections/collection-shared";

function adminHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("adminToken") : null;
  return token ? { "X-Admin-Token": token } : {};
}

export default function CollectionsManager() {
  const [items, setItems] = useState<CollectionSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p) });
        if (featuredOnly) params.set("featured", "1");
        const res = await fetch(`/api/admin/collections?${params}`, { headers: adminHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Failed to load");
        setItems(data.collections ?? []);
        setTotalPages(data.totalPages ?? 1);
        setPage(data.page ?? p);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [featuredOnly],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const toggleFeatured = async (c: CollectionSummary) => {
    setPending(c.id);
    try {
      const res = await fetch("/api/admin/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ id: c.id, isFeatured: !c.isFeatured }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, isFeatured: !x.isFeatured } : x)),
      );
    } catch {
      toast.error("Couldn't update that");
    } finally {
      setPending(null);
    }
  };

  const setLabel = async (c: CollectionSummary, label: string) => {
    try {
      const res = await fetch("/api/admin/collections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({ id: c.id, featuredLabel: label }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, featuredLabel: label || null } : x)),
      );
    } catch {
      toast.error("Couldn't save the label");
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFeaturedOnly((v) => !v)}
          aria-pressed={featuredOnly}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            featuredOnly
              ? "bg-amber-400/15 text-amber-300"
              : "text-muted-foreground hover:text-foreground dark:text-white/40 dark:hover:text-white/70",
          )}
        >
          Featured only
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/35">
          No public collections yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 dark:border-white/[0.08]"
            >
              <button
                type="button"
                onClick={() => void toggleFeatured(c)}
                disabled={pending === c.id}
                aria-label={c.isFeatured ? "Unfeature" : "Feature"}
                className={cn(
                  "shrink-0 rounded-lg p-2 transition-colors disabled:opacity-40",
                  c.isFeatured
                    ? "bg-amber-400/15 text-amber-300"
                    : "text-muted-foreground hover:text-foreground dark:text-white/25 dark:hover:text-white/60",
                )}
              >
                <Star className={cn("h-4 w-4", c.isFeatured && "fill-current")} />
              </button>

              <div className="min-w-0 flex-1">
                <a
                  href={collectionPath(c.id, c.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-semibold text-foreground hover:underline dark:text-white/85"
                >
                  {c.title}
                </a>
                <p className="truncate text-[11px] text-muted-foreground dark:text-white/35">
                  {c.ownerUsername} · {formatCount(c.itemCount)} anime ·{" "}
                  {formatCount(c.likeCount)} likes · {formatCount(c.followerCount)} followers
                </p>
              </div>

              {c.isFeatured && (
                <input
                  defaultValue={c.featuredLabel ?? ""}
                  onBlur={(e) => void setLabel(c, e.target.value.trim())}
                  placeholder="Shelf label"
                  className="w-36 shrink-0 rounded-lg border border-border bg-muted/40 px-2 py-1 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void load(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 dark:border-white/10 dark:text-white/50"
          >
            Prev
          </button>
          <span className="font-mono text-xs tabular-nums text-muted-foreground dark:text-white/35">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => void load(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 dark:border-white/10 dark:text-white/50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
