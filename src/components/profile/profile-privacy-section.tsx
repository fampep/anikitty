"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { withAuth } from "@/lib/auth/auth-fetch";
import { cn } from "@/lib/core/utils";

export default function ProfilePrivacySection() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profilePrivate, setProfilePrivate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/privacy", withAuth());
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setProfilePrivate(!!data.profilePrivate);
    } catch {
      toast.error("Could not load privacy settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async () => {
    const next = !profilePrivate;
    setBusy(true);
    try {
      const res = await fetch(
        "/api/account/privacy",
        withAuth({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profilePrivate: next }),
        }),
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      setProfilePrivate(next);
      toast.success(next ? "Ninja mode on — profile hidden" : "Profile is public again");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not update privacy");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground dark:text-white/35 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading privacy settings…
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={cn(
            "shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border text-lg",
            profilePrivate
              ? "bg-primary/10 border-primary/25"
              : "bg-muted/50 dark:bg-white/[0.04] border-border dark:border-white/10",
          )}
        >
          🥷
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground dark:text-white/85">Ninja mode</p>
          <p className="text-xs text-muted-foreground dark:text-white/40 mt-1 leading-relaxed">
            Hide your profile, watchlist, and activity from other users. You can still see your own
            profile — everyone else gets a stealth screen.
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-pressed={profilePrivate}
        aria-label={profilePrivate ? "Profile is hidden (ninja mode)" : "Profile is public"}
        onClick={toggle}
        disabled={busy}
        className={cn(
          "shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border disabled:opacity-50",
          profilePrivate
            ? "bg-primary/20 border-primary/30 text-zinc-200 hover:bg-primary/30"
            : "bg-muted/50 dark:bg-white/5 border-border dark:border-white/12 text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white",
        )}
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : profilePrivate ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
        {profilePrivate ? "Hidden" : "Go ninja"}
      </button>
    </div>
  );
}
