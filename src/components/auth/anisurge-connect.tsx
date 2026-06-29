"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { anisurgeAuth } from "@/lib/oauth/anisurge";
import { withAuth } from "@/lib/auth/auth-fetch";
import { CheckCircle2, LinkIcon, Loader2, Unlink } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

export default function AnisurgeConnect() {
  const t = useT();
  const { auth } = useAuthStore();

  const [linked, setLinked] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
      setLinked(!!me.anisurgeLinked);
      setUsername(me.anisurgeUsername ?? null);
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

  const handleConnect = async () => {
    if (!auth) {
      toast.error(t("auth.login"));
      return;
    }
    if (!identifier.trim() || !password) {
      toast.error(t("settings.linkAnisurgeError"));
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch(
        "/api/account/auth/link-anisurge",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: identifier.trim(), password }),
        }),
      );
      const data = await res.json();
      if (res.status === 409) {
        const msg =
          data.error === "already_linked"
            ? t("settings.anisurgeAlreadyLinked")
            : data.error === "taken"
              ? t("settings.anisurgeTaken")
              : data.error;
        throw new Error(msg);
      }
      if (!res.ok) throw new Error(data.error ?? t("settings.linkFailed"));
      setLinked(true);
      setUsername(data.anisurgeUsername ?? null);
      setIdentifier("");
      setPassword("");
      toast.success(t("settings.linkSuccess"));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t("settings.linkFailed");
      toast.error(message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!auth) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/account/auth/link-anisurge", withAuth({ method: "DELETE" }));
      if (!res.ok) throw new Error("Disconnect failed");
      setLinked(false);
      setUsername(null);
      toast.success(t("settings.unlinkSuccess"));
    } catch {
      toast.error(t("settings.unlinkFailed"));
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/30 text-sm font-mono py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t("settings.loading")}
      </div>
    );
  }

  if (linked) {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl bg-white/3 border border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">{t("settings.connected")}</p>
            {username && (
              <p className="text-[11px] font-mono text-white/30 mt-0.5 truncate">@{username}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/8 border border-red-500/20 text-red-400/80 text-xs font-medium hover:bg-red-500/15 disabled:opacity-40 transition-all shrink-0"
        >
          {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
          {t("settings.disconnect")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] text-white/35 font-mono leading-relaxed">
        {t("settings.anisurgeLinkHint")}
      </p>
      <input
        type="text"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder={t("settings.anisurgePlaceholder")}
        className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleConnect()}
        placeholder={t("settings.anisurgePassword")}
        className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
      />
      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting || !identifier.trim() || !password}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-sm font-medium hover:bg-white/14 disabled:opacity-35 transition-all"
      >
        {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
        {t("settings.connectAnisurge")}
      </button>
    </div>
  );
}
