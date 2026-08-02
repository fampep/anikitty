"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Library, Loader2, Plus } from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/core/utils";
import { CollectionEditorDialog } from "./collection-editor-dialog";
import { CollectionIconGlyph } from "./collection-icon";
import type { CollectionSummary } from "@/lib/collections/collection-shared";

type Props = {
  animeId: string;
  anilistId?: number | null;
  animeTitle?: string | null;
  animeThumbnail?: string | null;
  className?: string;
};

/**
 * Dropdown that adds the current anime to any collection the viewer can edit.
 * Membership is only fetched when the menu opens, so the anime page doesn't
 * pay for it on every load.
 */
export function AddToCollectionButton({
  animeId,
  anilistId,
  animeTitle,
  animeThumbnail,
  className,
}: Props) {
  const { auth } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [member, setMember] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/collections?mine=1&contains=${encodeURIComponent(animeId)}`,
        withAuth(),
      );
      const data = await res.json();
      setCollections(data.collections ?? []);
      setMember(new Set<string>(data.memberOf ?? []));
    } catch {
      toast.error("Couldn't load your collections");
    } finally {
      setLoading(false);
    }
  }, [animeId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!auth) return null;

  const toggle = async (collectionId: string) => {
    const isMember = member.has(collectionId);
    setPending(collectionId);
    try {
      const res = isMember
        ? await fetch(
            `/api/collections/${collectionId}/items?animeId=${encodeURIComponent(animeId)}`,
            withAuth({ method: "DELETE" }),
          )
        : await fetch(
            `/api/collections/${collectionId}/items`,
            withAuth({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ animeId, anilistId, animeTitle, animeThumbnail }),
            }),
          );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed");

      setMember((prev) => {
        const next = new Set(prev);
        if (isMember) next.delete(collectionId);
        else next.add(collectionId);
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:text-white/60 dark:hover:text-white/85"
      >
        <Library className="h-3.5 w-3.5" />
        Collection
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl border border-border bg-[#0d0d0d] p-1.5 shadow-2xl shadow-black/70 dark:border-white/10">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-white/30" />
            </div>
          ) : collections.length === 0 ? (
            <p className="px-2 py-3 text-center text-[11px] text-white/35">
              No collections yet.
            </p>
          ) : (
            collections.map((c) => {
              const isMember = member.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void toggle(c.id)}
                  disabled={pending === c.id}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center">
                    {pending === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-white/40" />
                    ) : isMember ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <CollectionIconGlyph name={c.icon} className="h-3.5 w-3.5 text-white/30" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-white/75">{c.title}</span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/25">
                    {c.itemCount}
                  </span>
                </button>
              );
            })
          )}

          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-white/[0.06] px-2 py-2 text-left text-xs font-semibold text-white/50 transition-colors hover:text-white/85"
          >
            <Plus className="h-3.5 w-3.5" />
            New collection
          </button>
        </div>
      )}

      <CollectionEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={async ({ id }) => {
          setEditorOpen(false);
          // Drop the anime straight into the collection that was just made.
          await fetch(
            `/api/collections/${id}/items`,
            withAuth({
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ animeId, anilistId, animeTitle, animeThumbnail }),
            }),
          ).catch(() => {});
          void load();
        }}
      />
    </div>
  );
}
