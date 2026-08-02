"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { cn } from "@/lib/core/utils";
import type { CollectionRole } from "@/lib/collections/collection-shared";

type Collaborator = {
  userId: string;
  role: string;
  username: string | null;
  avatarUrl: string | null;
};

const INVITE_ROLES: { id: Exclude<CollectionRole, "owner">; label: string; hint: string }[] = [
  { id: "editor", label: "Editor", hint: "Can change settings and any item" },
  { id: "contributor", label: "Contributor", hint: "Can add titles and remove their own" },
];

export function CollectionCollaborators({ collectionId }: { collectionId: string }) {
  const [list, setList] = useState<Collaborator[]>([]);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Exclude<CollectionRole, "owner">>("contributor");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/collections/${collectionId}/collaborators`, withAuth());
      if (!res.ok) return;
      const data = await res.json();
      setList(data.collaborators ?? []);
    } catch {
      // Non-critical panel — leave the list as-is on failure.
    }
  }, [collectionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    const name = username.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/collections/${collectionId}/collaborators`,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name, role }),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Couldn't add them");
      setUsername("");
      toast.success(`${name} added as ${role}`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add them");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (userId: string) => {
    try {
      const res = await fetch(
        `/api/collections/${collectionId}/collaborators?userId=${encodeURIComponent(userId)}`,
        withAuth({ method: "DELETE" }),
      );
      if (!res.ok) throw new Error();
      setList((prev) => prev.filter((c) => c.userId !== userId));
    } catch {
      toast.error("Couldn't remove them");
    }
  };

  return (
    <div className="rounded-2xl border border-border p-4 dark:border-white/[0.08]">
      <h3 className="mb-3 text-xs font-semibold text-foreground dark:text-white/70">
        Collaborators
      </h3>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void invite();
          }}
          disabled={busy}
          placeholder="Username"
          className="min-w-[140px] flex-1 rounded-xl border border-border bg-muted/60 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/30"
        />
        <div className="flex gap-1">
          {INVITE_ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              title={r.hint}
              aria-pressed={role === r.id}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                role === r.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground dark:text-white/35 dark:hover:text-white/70",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void invite()}
          disabled={busy || !username.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary/15 px-3 py-1.5 text-[11px] font-bold text-primary ring-1 ring-primary/25 transition-colors hover:bg-primary/25 disabled:opacity-40"
        >
          <UserPlus className="h-3 w-3" />
          Add
        </button>
      </div>

      {list.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {list.map((c) => (
            <li
              key={c.userId}
              className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 dark:bg-white/[0.03]"
            >
              <span className="min-w-0 truncate text-xs text-foreground dark:text-white/70">
                {c.username ?? "Unknown user"}
                <span className="ml-2 text-[10px] text-muted-foreground dark:text-white/30">
                  {c.role}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void remove(c.userId)}
                aria-label={`Remove ${c.username ?? "collaborator"}`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-rose-300 dark:text-white/30"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
