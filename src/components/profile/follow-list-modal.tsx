"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FramedAvatar from "@/components/common/framed-avatar";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/providers/i18n-provider";

type FollowUser = { username: string; avatarUrl?: string | null; equippedFrame?: string | null };

export type FollowListType = "followers" | "following";

export default function FollowListModal({
  username,
  type,
  open,
  onOpenChange,
}: {
  username: string;
  type: FollowListType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !type) return;
    let cancelled = false;
    setLoading(true);
    setUsers([]);
    fetch(`/api/users/${encodeURIComponent(username)}/follow?type=${type}`)
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d: { users?: FollowUser[] }) => {
        if (!cancelled) setUsers(d.users ?? []);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, type, username]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border dark:border-white/8">
          <DialogTitle className="text-base">
            {type === "following" ? t("profile.following") : t("profile.followers")}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[min(24rem,60vh)] overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground dark:text-white/40">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
              {t("profile.followEmpty")}
            </p>
          ) : (
            users.map((u) => (
              <Link
                key={u.username}
                href={`/profile/${encodeURIComponent(u.username)}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-accent dark:hover:bg-white/[0.04] transition-colors"
              >
                <FramedAvatar username={u.username} url={u.avatarUrl ?? undefined} frameSlug={u.equippedFrame} className="w-9 h-9" />
                <span className="text-sm font-medium text-foreground dark:text-white/85">@{u.username}</span>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
