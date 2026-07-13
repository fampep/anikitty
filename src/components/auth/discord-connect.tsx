"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { anisurgeAuth } from "@/lib/oauth/anisurge";
import { withAuth } from "@/lib/auth/auth-fetch";
import { CheckCircle2, LinkIcon, Loader2, Unlink } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export default function DiscordConnect() {
  const t = useT();
  const { auth } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [linked, setLinked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [botEnabled, setBotEnabled] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!auth) {
      setLoading(false);
      return;
    }
    try {
      const me = await anisurgeAuth.me();
      setLinked(!!me.discordLinked);
      setUsername(me.discordUsername ?? null);
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
    const status = searchParams.get("discord");
    if (!status) return;

    const messages: Record<string, { type: "success" | "error"; key: string }> = {
      connected: { type: "success", key: "settings.discordLinkSuccess" },
      error: { type: "error", key: "settings.discordLinkFailed" },
      taken: { type: "error", key: "settings.discordTaken" },
      already_linked: { type: "error", key: "settings.discordAlreadyLinked" },
    };

    const msg = messages[status];
    if (msg) {
      toast[msg.type](t(msg.key));
      if (status === "connected") loadAccount();
    }

    const tab = searchParams.get("tab") ?? "connections";
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  }, [searchParams, router, loadAccount, t]);

  useEffect(() => {
    fetch("/api/account/auth/discord/status")
      .then((r) => r.json())
      .then((d) => setBotEnabled(!!d?.botEnabled))
      .catch(() => setBotEnabled(false));
  }, []);

  const handleGenerateLinkCode = async () => {
    if (!auth) return;
    setGeneratingCode(true);
    try {
      const res = await fetch("/api/account/discord/link-code", withAuth({ method: "POST" }));
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? t("settings.discordLinkCodeFailed"));
      setLinkCode(body.code);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("settings.discordLinkCodeFailed");
      toast.error(message);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyLinkCode = async () => {
    if (!linkCode) return;
    try {
      await navigator.clipboard.writeText(linkCode);
      toast.success(t("settings.discordLinkCodeCopy"));
    } catch {
      toast.error(t("settings.discordLinkCodeFailed"));
    }
  };

  const handleConnect = async () => {
    if (!auth) {
      toast.error(t("auth.login"));
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/api/account/auth/discord/start", withAuth({ method: "POST" }));
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? t("settings.discordLinkFailed"));
      window.location.href = body.url;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("settings.discordLinkFailed");
      toast.error(message);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!auth) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/account/auth/discord", withAuth({ method: "DELETE" }));
      if (!res.ok) throw new Error("Disconnect failed");
      setLinked(false);
      setUsername(null);
      toast.success(t("settings.discordUnlinkSuccess"));
    } catch {
      toast.error(t("settings.discordUnlinkFailed"));
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground dark:text-white/30 text-sm font-mono py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t("settings.loading")}
      </div>
    );
  }

  if (linked) {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl bg-muted/30 dark:bg-white/3 border border-border dark:border-white/10">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/25 text-[#5865F2]">
            <DiscordIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground/90 dark:text-white/80 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {t("settings.connected")}
            </p>
            {username && (
              <p className="text-[11px] font-mono text-muted-foreground dark:text-white/30 mt-0.5">{username}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400/80 text-xs font-medium hover:bg-red-500/15 disabled:opacity-40 transition-all"
        >
          {disconnecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Unlink className="w-3 h-3" />
          )}
          {t("settings.disconnect")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#5865F2]/12 border border-[#5865F2]/25 text-[#c8cdff] text-sm font-medium hover:bg-[#5865F2]/20 disabled:opacity-40 transition-all"
      >
        {connecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LinkIcon className="w-4 h-4" />
        )}
        <DiscordIcon className="w-4 h-4" />
        {t("settings.connectDiscord")}
      </button>

      {botEnabled ? (
        <div className="rounded-xl border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground/90 dark:text-white/80">
              {t("settings.discordLinkCodeTitle")}
            </p>
            <p className="text-[11px] text-muted-foreground dark:text-white/40 mt-1 leading-relaxed">
              {t("settings.discordLinkCodeHint")}
            </p>
          </div>
          {linkCode ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-black/20 px-3 py-2 text-center font-mono text-lg tracking-[0.2em] text-[#c8cdff]">
                {linkCode}
              </code>
              <button
                type="button"
                onClick={handleCopyLinkCode}
                className="px-3 py-2 rounded-lg border border-[#5865F2]/25 text-xs font-medium text-[#c8cdff] hover:bg-[#5865F2]/10"
              >
                {t("settings.discordLinkCodeCopy")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateLinkCode}
              disabled={generatingCode}
              className="w-full px-3 py-2 rounded-lg border border-[#5865F2]/20 text-sm text-[#c8cdff]/90 hover:bg-[#5865F2]/10 disabled:opacity-40"
            >
              {generatingCode ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                t("settings.discordLinkCodeGenerate")
              )}
            </button>
          )}
          {linkCode ? (
            <p className="text-[10px] font-mono text-muted-foreground dark:text-white/30">
              {t("settings.discordLinkCodeExpires")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { DiscordIcon };
