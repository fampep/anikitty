"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { cn } from "@/lib/core/utils";
import { CollectionCard } from "@/components/collections/collection-card";
import type { CollectionSummary } from "@/lib/collections/collection-shared";

type Props = {
  /** Profile owner's user id — required to list their public collections. */
  userId: string;
  /** True when the viewer is looking at their own profile. */
  isSelf: boolean;
};

type Tab = "created" | "following";

export function ProfileCollectionsFeed({ userId, isSelf }: Props) {
  const [tab, setTab] = useState<Tab>("created");
  const [items, setItems] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // "Following" is private to the viewer, so it only ever loads for self.
        const url =
          tab === "following"
            ? "/api/collections/following"
            : isSelf
              ? "/api/collections?mine=1"
              : `/api/collections?userId=${encodeURIComponent(userId)}`;
        const res = await fetch(url, withAuth());
        const data = await res.json();
        if (!cancelled) setItems(data.collections ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, userId, isSelf]);

  return (
    <div>
      {isSelf && (
        <div className="mb-4 flex gap-1">
          {(["created", "following"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === id
                  ? "bg-accent text-foreground dark:bg-white/12 dark:text-white"
                  : "text-muted-foreground hover:text-foreground dark:text-white/35 dark:hover:text-white/70",
              )}
            >
              {id === "created" ? "Created" : "Following"}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground dark:text-white/30" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center dark:border-white/[0.09]">
          <p className="text-sm text-muted-foreground dark:text-white/35">
            {tab === "following" ? "Not following any collections yet." : "No collections yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => (
            <CollectionCard key={c.id} collection={c} showVisibility={isSelf} />
          ))}
        </div>
      )}
    </div>
  );
}
