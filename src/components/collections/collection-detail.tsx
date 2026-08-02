"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BarChart3,
  Copy,
  Eye,
  Heart,
  Library,
  Loader2,
  Lock,
  Pencil,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/core/utils";
import { APP_URL } from "@/lib/seo/site-seo";
import { CollectionCover } from "./collection-cover";
import { CollectionIconGlyph } from "./collection-icon";
import { CollectionShareBar } from "./collection-share-bar";
import { CollectionEditorDialog } from "./collection-editor-dialog";
import { CollectionStatsPanel } from "./collection-stats-panel";
import { CollectionCollaborators } from "./collection-collaborators";
import CommentSection from "@/components/comments/comment-section";
import {
  COLLECTION_CATEGORY_LABELS,
  canEditCollection,
  collectionCommentKey,
  collectionPath,
  formatCount,
  type CollectionCategory,
  type CollectionItem,
  type CollectionSummary,
} from "@/lib/collections/collection-shared";

type Props = {
  initialCollection: CollectionSummary;
  initialItems: CollectionItem[];
  /** True when the server withheld contents pending an auth check. */
  gated: boolean;
};

export function CollectionDetail({ initialCollection, initialItems, gated }: Props) {
  const { auth } = useAuthStore();
  const [collection, setCollection] = useState(initialCollection);
  const [items, setItems] = useState(initialItems);
  const [loadingGated, setLoadingGated] = useState(gated);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState<"like" | "follow" | "fork" | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const canEdit = canEditCollection(collection.myRole);
  const isOwner = collection.myRole === "owner";
  const url = `${APP_URL}${collectionPath(collection.id, collection.slug)}`;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/collections/${collection.id}`, withAuth());
      if (res.status === 404) {
        setDenied(true);
        return;
      }
      const data = await res.json();
      if (data?.collection) {
        setCollection(data.collection);
        setItems(data.items ?? []);
        setDenied(false);
      }
    } finally {
      setLoadingGated(false);
    }
  }, [collection.id]);

  // A private collection ships as an empty shell; fetch the real contents once
  // the client has a token to prove access.
  useEffect(() => {
    if (!gated) return;
    if (!auth) {
      setLoadingGated(false);
      setDenied(true);
      return;
    }
    void refresh();
  }, [gated, auth, refresh]);

  // Records at most one view per viewer per day server-side.
  useEffect(() => {
    if (gated) return;
    void fetch(`/api/collections/${collection.id}/view`, withAuth({ method: "POST" })).catch(
      () => {},
    );
  }, [collection.id, gated]);

  const toggle = async (kind: "like" | "follow") => {
    if (!auth) {
      toast.error("Sign in first");
      return;
    }
    setBusy(kind);
    try {
      const res = await fetch(
        `/api/collections/${collection.id}/${kind}`,
        withAuth({ method: "POST" }),
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setCollection((c) => ({
        ...c,
        ...(kind === "like"
          ? { liked: data.liked, likeCount: data.likeCount }
          : { following: data.following, followerCount: data.followerCount }),
      }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const fork = async () => {
    if (!auth) {
      toast.error("Sign in first");
      return;
    }
    setBusy("fork");
    try {
      const res = await fetch(
        `/api/collections/${collection.id}/fork`,
        withAuth({ method: "POST" }),
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to copy");
      toast.success("Copied to your collections");
      window.location.href = collectionPath(data.id, data.slug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to copy");
    } finally {
      setBusy(null);
    }
  };

  const removeItem = async (animeId: string) => {
    try {
      const res = await fetch(
        `/api/collections/${collection.id}/items?animeId=${encodeURIComponent(animeId)}`,
        withAuth({ method: "DELETE" }),
      );
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.animeId !== animeId));
      setCollection((c) => ({ ...c, itemCount: Math.max(0, c.itemCount - 1) }));
    } catch {
      toast.error("Couldn't remove that");
    }
  };

  const deleteCollection = async () => {
    if (!window.confirm("Delete this collection? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/collections/${collection.id}`, withAuth({ method: "DELETE" }));
      if (!res.ok) throw new Error();
      toast.success("Collection deleted");
      window.location.href = "/collections";
    } catch {
      toast.error("Couldn't delete the collection");
    }
  };

  const updatedLabel = useMemo(() => {
    const iso = collection.itemsUpdatedAt ?? collection.updatedAt;
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days <= 0) return "Updated today";
    if (days === 1) return "Updated yesterday";
    if (days < 30) return `Updated ${days} days ago`;
    const months = Math.floor(days / 30);
    return `Updated ${months} month${months === 1 ? "" : "s"} ago`;
  }, [collection.itemsUpdatedAt, collection.updatedAt]);

  const categoryLabel = collection.category
    ? COLLECTION_CATEGORY_LABELS[collection.category as CollectionCategory] ?? collection.category
    : null;

  if (loadingGated) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground dark:text-white/30" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Lock className="h-8 w-8 text-muted-foreground/30 dark:text-white/15" />
        <p className="text-sm text-muted-foreground dark:text-white/40">
          This collection is private.
        </p>
        <Link
          href="/collections"
          className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:text-white/60 dark:hover:text-white/85"
        >
          Browse collections
        </Link>
      </div>
    );
  }

  return (
    <div>
      <CollectionCover
        coverType={collection.coverType}
        coverValue={collection.coverValue}
        thumbnails={items.map((i) => i.animeThumbnail).filter((t): t is string => !!t)}
        className="h-40 w-full rounded-2xl sm:h-56"
      />

      <div className="mt-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CollectionIconGlyph
              name={collection.icon}
              className="h-5 w-5 shrink-0 text-foreground dark:text-white/80"
            />
            <h1 className="truncate text-xl font-bold text-foreground dark:text-white sm:text-2xl">
              {collection.title}
            </h1>
            {collection.isFeatured && (
              <span className="shrink-0 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold text-black">
                {collection.featuredLabel || "Featured"}
              </span>
            )}
            {collection.visibility !== "public" && (
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                {collection.visibility === "private" ? "Private" : "Unlisted"}
              </span>
            )}
          </div>

          {collection.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground dark:text-white/50">
              {collection.description}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground dark:text-white/35">
            {collection.ownerUsername && (
              <Link
                href={`/profile/${encodeURIComponent(collection.ownerUsername)}`}
                className="font-semibold text-foreground transition-colors hover:text-primary dark:text-white/70"
              >
                {collection.ownerUsername}
              </Link>
            )}
            {categoryLabel && <span>{categoryLabel}</span>}
            {updatedLabel && <span>{updatedLabel}</span>}
          </div>

          {collection.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {collection.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground dark:text-white/45"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs tabular-nums text-muted-foreground dark:text-white/40">
        <span className="inline-flex items-center gap-1.5">
          <Library className="h-3.5 w-3.5" />
          {formatCount(collection.itemCount)} anime
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5" />
          {formatCount(collection.likeCount)} likes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {formatCount(collection.followerCount)} followers
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          {formatCount(collection.viewCount)} views
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
          {formatCount(collection.shareCount)} shares
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void toggle("like")}
          disabled={busy === "like"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-40",
            collection.liked
              ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30"
              : "border border-border text-muted-foreground hover:text-foreground dark:border-white/10 dark:text-white/60 dark:hover:text-white/85",
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", collection.liked && "fill-current")} />
          {collection.liked ? "Liked" : "Like"}
        </button>

        {!isOwner && (
          <button
            type="button"
            onClick={() => void toggle("follow")}
            disabled={busy === "follow" || collection.visibility === "private"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors disabled:opacity-40",
              collection.following
                ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "border border-border text-muted-foreground hover:text-foreground dark:border-white/10 dark:text-white/60 dark:hover:text-white/85",
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {collection.following ? "Following" : "Follow"}
          </button>
        )}

        <button
          type="button"
          onClick={() => void fork()}
          disabled={busy === "fork"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 dark:border-white/10 dark:text-white/60 dark:hover:text-white/85"
        >
          <Copy className="h-3.5 w-3.5" />
          Make a copy
        </button>

        {canEdit && (
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:text-white/60 dark:hover:text-white/85"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={() => setShowStats((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground dark:border-white/10 dark:text-white/60 dark:hover:text-white/85"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Stats
          </button>
        )}

        {isOwner && (
          <button
            type="button"
            onClick={() => void deleteCollection()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-300/80 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>

      {collection.visibility !== "private" && (
        <div className="mt-3">
          <CollectionShareBar
            collectionId={collection.id}
            url={url}
            title={collection.title}
          />
        </div>
      )}

      {collection.forkedFromId && (
        <p className="mt-3 text-[11px] text-muted-foreground dark:text-white/30">
          Copied from{" "}
          <Link
            href={`/collection/${collection.forkedFromId}/collection`}
            className="underline transition-colors hover:text-foreground dark:hover:text-white/60"
          >
            another collection
          </Link>
          .
        </p>
      )}

      {showStats && canEdit && (
        <div className="mt-5">
          <CollectionStatsPanel collectionId={collection.id} />
        </div>
      )}

      {isOwner && (
        <div className="mt-5">
          <CollectionCollaborators collectionId={collection.id} />
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-foreground dark:text-white/80">
        In this collection
      </h2>

      {items.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border py-12 text-center dark:border-white/[0.09]">
          <p className="text-sm text-muted-foreground dark:text-white/35">
            Nothing here yet.
          </p>
          {canEdit && (
            <p className="mt-1.5 text-[11px] text-muted-foreground dark:text-white/25">
              Add anime from any title&apos;s page.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <div key={item.id} className="group relative">
              <Link href={`/anime/${encodeURIComponent(item.animeId)}`} className="block">
                <div className="aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900">
                  {item.animeThumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.animeThumbnail}
                      alt={item.animeTitle ?? ""}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-foreground dark:text-white/70">
                  {item.animeTitle ?? item.animeId}
                </p>
              </Link>
              {item.note && (
                <p className="mt-1 line-clamp-2 text-[11px] italic text-muted-foreground dark:text-white/35">
                  {item.note}
                </p>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void removeItem(item.animeId)}
                  aria-label="Remove from collection"
                  className="absolute right-1.5 top-1.5 rounded-lg bg-black/70 p-1.5 text-white/70 opacity-0 backdrop-blur-sm transition-opacity hover:text-rose-300 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {collection.visibility !== "private" && (
        <div className="mt-10">
          <CommentSection animeId={collectionCommentKey(collection.id)} />
        </div>
      )}

      <CollectionEditorDialog
        open={editorOpen}
        collection={collection}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          setEditorOpen(false);
          void refresh();
        }}
      />
    </div>
  );
}
