"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/common/avatar";
import { withAuth } from "@/lib/auth/auth-fetch";
import { Loader2, Ban } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/providers/i18n-provider";

type Blocked = { username: string; avatarUrl?: string | null };

export default function BlockedUsersSection() {
  const t = useT();
  const [users, setUsers] = useState<Blocked[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/blocks", withAuth())
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d: { users?: Blocked[] }) => setUsers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unblock = async (username: string) => {
    setBusy(username);
    try {
      const res = await fetch(
        "/api/account/blocks",
        withAuth({
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        }),
      );
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.filter((u) => u.username !== username));
    } catch {
      toast.error(t("profile.blockFailed"));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6 text-muted-foreground dark:text-white/40">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
        {t("settings.blockedEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {users.map((u) => (
        <div
          key={u.username}
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30 dark:bg-white/3 border border-border dark:border-white/8"
        >
          <Avatar username={u.username} url={u.avatarUrl ?? undefined} className="w-8 h-8 shrink-0" />
          <Link
            href={`/profile/${encodeURIComponent(u.username)}`}
            className="flex-1 min-w-0 text-sm font-medium text-foreground/85 dark:text-white/75 hover:underline truncate"
          >
            @{u.username}
          </Link>
          <button
            type="button"
            onClick={() => unblock(u.username)}
            disabled={busy === u.username}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/12 text-[12px] font-medium text-muted-foreground dark:text-white/50 hover:text-foreground/90 dark:hover:text-white/80 hover:border-border dark:hover:border-white/25 transition-all disabled:opacity-60"
          >
            {busy === u.username ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
            {t("profile.unblock")}
          </button>
        </div>
      ))}
    </div>
  );
}
