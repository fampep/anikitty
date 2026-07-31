"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { accountAuth, anilistSync } from "@/lib/oauth/account";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useWatchlistStore } from "@/store/watchlist-store";
import { Check, Link2, Link2Off, Loader2, RefreshCw } from "lucide-react";
import AnilistIcon from "@/icons/anilist";
import { cn } from "@/lib/core/utils";

function AnilistConnect() {
  const { auth } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [linked, setLinked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [overrideWatchlist, setOverrideWatchlist] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    imported: number;
    removed: number;
    skipped: number;
  } | null>(null);

  const loadAccount = useCallback(async () => {
    if (!auth) {
      setLoading(false);
      return;
    }
    try {
      const me = await accountAuth.me();
      setLinked(!!me.anilistLinked);
      setUsername(me.anilistUsername ?? null);
    } catch {
      setLinked(false);
      setUsername(null);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    const status = searchParams.get("anilist");
    if (!status) return;

    if (status === "connected") {
      toast.success("AniList account connected!");
      loadAccount();
    } else if (status === "error") {
      toast.error("Failed to connect AniList. Please try again.");
    }

    router.replace("/settings", { scroll: false });
  }, [searchParams, router, loadAccount]);

  const handleConnect = async () => {
    if (!auth) {
      toast.error("Please log in first");
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/api/anilist/oauth/start", withAuth({ method: "POST" }));
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to start OAuth");
      window.location.href = body.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to connect AniList");
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!linked) return;
    setSyncing(true);
    try {
      const result = await anilistSync.importWatchlist(overrideWatchlist);
      setSyncResult({
        imported: result.imported,
        removed: result.removed ?? 0,
        skipped: result.skipped ?? 0,
      });
      useWatchlistStore.getState().bump();
      if (overrideWatchlist) {
        toast.success(
          `Watchlist replaced with AniList — ${result.imported} anime${result.removed ? `, ${result.removed} removed` : ""}.`,
        );
      } else {
        toast.success(`Synced ${result.imported} anime from AniList.`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed. Try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!auth) return;

    setDisconnecting(true);
    try {
      const res = await fetch("/api/anilist/disconnect", withAuth({ method: "DELETE" }));
      if (!res.ok) throw new Error("Disconnect failed");
      setLinked(false);
      setUsername(null);
      setSyncResult(null);
      toast.success("AniList disconnected");
    } catch {
      toast.error("Failed to disconnect AniList");
    } finally {
      setDisconnecting(false);
    }
  };

  if (!auth) return null;

  if (loading) {
    return (
      <div className="w-full rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/3 p-4 flex items-center justify-center gap-2 text-muted-foreground dark:text-white/40 text-xs">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/3 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full">
          <AnilistIcon />
        </span>
        <span className="text-xs font-bold text-muted-foreground dark:text-white/50 uppercase tracking-wider font-mono">AniList</span>
        {linked && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground dark:text-white/40 font-mono">
            <Check className="w-3 h-3" /> linked
          </span>
        )}
      </div>

      {linked && username ? (
        <>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10">
            <span className="text-muted-foreground dark:text-white/70 text-sm font-semibold truncate flex-1">@{username}</span>
          </div>

          <p className="text-[11px] text-muted-foreground dark:text-white/35 leading-relaxed">
            Watch progress syncs automatically when you finish episodes. Import pulls your full AniList — nothing is skipped.
          </p>

          <label
            className={cn(
              "flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
              overrideWatchlist
                ? "border-amber-500/30 bg-amber-500/8"
                : "border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] hover:border-border dark:border-white/14",
            )}
          >
            <input
              type="checkbox"
              checked={overrideWatchlist}
              onChange={(e) => setOverrideWatchlist(e.target.checked)}
              className="mt-0.5 accent-amber-400"
            />
            <span className="text-[11px] text-muted-foreground dark:text-white/45 leading-relaxed">
              <span className="font-semibold text-muted-foreground dark:text-white/65">Replace my watchlist</span>
              {" — "}
              AniList becomes the source of truth. Removes local entries not on your AniList and overwrites statuses.
            </span>
          </label>

          {syncResult && (
            <p className="text-[10px] text-muted-foreground dark:text-white/30 font-mono">
              Last sync: {syncResult.imported} imported
              {syncResult.removed > 0 ? `, ${syncResult.removed} removed` : ""}
              {syncResult.skipped > 0 ? `, ${syncResult.skipped} skipped` : ""}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border dark:border-white/10 bg-muted/50 dark:bg-white/5 hover:bg-accent dark:hover:bg-white/10 text-muted-foreground dark:text-white/55 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {syncing ? "Syncing…" : overrideWatchlist ? "Replace from AniList" : "Import watchlist"}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-3 py-1.5 rounded-lg border border-red-900/40 text-red-700 hover:text-red-400 text-xs transition-colors disabled:opacity-50"
              title="Disconnect"
              aria-label="Disconnect AniList account"
            >
              {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2Off className="w-3.5 h-3.5" />}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground dark:text-white/35 leading-relaxed">
            Connect your AniList account to sync watch progress and import your watchlist.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#02A9FF] hover:bg-[#02A9FF]/90 disabled:opacity-50 text-foreground dark:text-white text-sm font-semibold transition-colors"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {connecting ? "Redirecting…" : "Connect with AniList"}
          </button>
        </>
      )}
    </div>
  );
}

export default AnilistConnect;
