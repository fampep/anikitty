"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { anisurgeAuth } from "@/lib/oauth/anisurge";
import { withAuth } from "@/lib/auth/auth-fetch";
import { Check, Link2, Link2Off, Loader2 } from "lucide-react";
import MalIcon from "@/icons/mal";

function MalConnect() {
  const { auth } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [linked, setLinked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!auth) {
      setLoading(false);
      return;
    }
    try {
      const me = await anisurgeAuth.me();
      setLinked(!!me.malLinked);
      setUsername(me.malUsername ?? null);
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
    const status = searchParams.get("mal");
    if (!status) return;
    const reason = searchParams.get("reason");
    if (status === "connected") {
      toast.success("MyAnimeList account connected!");
      loadAccount();
    } else if (status === "error") {
      const messages: Record<string, string> = {
        denied: "MyAnimeList sign-in was cancelled.",
        invalid_state: "MyAnimeList sign-in expired. Please try again.",
        not_configured: "MyAnimeList login is not configured on this server.",
        token_exchange:
          "MyAnimeList rejected the login. Check that the redirect URL in your MAL app matches this site.",
        profile: "Connected to MyAnimeList but could not load your profile.",
        missing_params: "MyAnimeList did not return a valid authorization response.",
      };
      toast.error(messages[reason ?? ""] ?? "Failed to connect MyAnimeList. Please try again.");
    }
    router.replace("/settings?tab=connections", { scroll: false });
  }, [searchParams, router, loadAccount]);

  const handleConnect = async () => {
    if (!auth) {
      toast.error("Please log in first");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/mal/oauth/start", withAuth({ method: "POST" }));
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Failed to start OAuth");
      window.location.href = body.url;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to connect MyAnimeList");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!auth) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/mal/disconnect", withAuth({ method: "DELETE" }));
      if (!res.ok) throw new Error("Disconnect failed");
      setLinked(false);
      setUsername(null);
      toast.success("MyAnimeList disconnected");
    } catch {
      toast.error("Failed to disconnect MyAnimeList");
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
          <MalIcon />
        </span>
        <span className="text-xs font-bold text-muted-foreground dark:text-white/50 uppercase tracking-wider font-mono">MyAnimeList</span>
        {linked && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground dark:text-white/40 font-mono">
            <Check className="w-3 h-3" /> linked
          </span>
        )}
      </div>

      {linked && username ? (
        <>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10">
            <a
              href={`https://myanimelist.net/profile/${encodeURIComponent(username)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground dark:text-white/70 text-sm font-semibold truncate flex-1 hover:text-foreground/90 dark:hover:text-white"
            >
              @{username}
            </a>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-red-900/40 text-red-700 hover:text-red-400 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2Off className="w-3.5 h-3.5" />}
            Disconnect
          </button>
        </>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground dark:text-white/35 leading-relaxed">
            Connect your MyAnimeList account to link your profile.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#2E51A2] hover:bg-[#2E51A2]/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {connecting ? "Redirecting…" : "Connect with MyAnimeList"}
          </button>
        </>
      )}
    </div>
  );
}

export default MalConnect;
