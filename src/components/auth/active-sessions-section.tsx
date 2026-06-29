"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MonitorSmartphone, LogOut, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { anisurgeAuth, clearAnisurgeToken } from "@/lib/oauth/anisurge";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/core/utils";

type SessionItem = {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  lastActiveAt: string | null;
  createdAt: string | null;
  current: boolean;
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Unknown";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ActiveSessionsSection() {
  const { clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await anisurgeAuth.getSessions();
      setSessions(data.sessions);
      setSelected(new Set());
    } catch {
      toast.error("Could not load active sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(sessions.map((s) => s.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleRevokedCurrent = (currentRevoked: boolean) => {
    if (currentRevoked) {
      clearAnisurgeToken();
      clearAuth();
      toast.success("Signed out on this device");
    }
  };

  const revokeSelected = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one device");
      return;
    }
    setBusy(true);
    try {
      const result = await anisurgeAuth.revokeSessions([...selected]);
      toast.success(
        result.revoked.length === 1
          ? "Signed out 1 device"
          : `Signed out ${result.revoked.length} devices`,
      );
      handleRevokedCurrent(result.currentRevoked);
      if (!result.currentRevoked) await loadSessions();
    } catch (e: unknown) {
      const err = e as { body?: { error?: string } };
      toast.error(err?.body?.error ?? "Could not sign out devices");
    } finally {
      setBusy(false);
    }
  };

  const revokeAllOthers = async () => {
    setBusy(true);
    try {
      const result = await anisurgeAuth.revokeOtherSessions();
      toast.success(
        result.revoked.length === 0
          ? "No other active sessions"
          : `Signed out ${result.revoked.length} other device${result.revoked.length === 1 ? "" : "s"}`,
      );
      await loadSessions();
    } catch (e: unknown) {
      const err = e as { body?: { error?: string } };
      toast.error(err?.body?.error ?? "Could not sign out other devices");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/30 text-sm font-mono py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading sessions…
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-white/40 font-mono">
        No tracked sessions yet. Sign in again on this device to start tracking active logins.
      </p>
    );
  }

  const otherCount = sessions.filter((s) => !s.current).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-white/45 leading-relaxed">
        These are browsers and devices where you&apos;re signed in. Revoke any session you don&apos;t recognize.
      </p>

      <div className="flex flex-col gap-2">
        {sessions.map((session) => {
          const checked = selected.has(session.id);
          return (
            <button
              key={session.id}
              type="button"
              disabled={busy}
              onClick={() => toggle(session.id)}
              className={cn(
                "flex items-start gap-3 w-full text-left px-4 py-3 rounded-xl border transition-all",
                checked
                  ? "border-violet-400/35 bg-violet-500/8"
                  : "border-white/8 bg-white/3 hover:border-white/15",
                busy && "opacity-60 cursor-not-allowed",
              )}
            >
              <span className="mt-0.5 text-white/35 shrink-0">
                {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              </span>
              <span className="mt-0.5 text-white/30 shrink-0">
                <MonitorSmartphone className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white/80">{session.deviceLabel}</span>
                  {session.current && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      This device
                    </span>
                  )}
                </span>
                <span className="block text-[11px] font-mono text-white/30 mt-1">
                  Active {formatRelativeTime(session.lastActiveAt)}
                  {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={revokeSelected}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-medium hover:bg-red-500/18 disabled:opacity-40 transition-all"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          Sign out selected ({selected.size})
        </button>

        {otherCount > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={revokeAllOthers}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/6 border border-white/12 text-white/65 text-xs font-medium hover:bg-white/10 disabled:opacity-40 transition-all"
          >
            Sign out all other devices
          </button>
        )}

        {sessions.length > 1 && (
          <button
            type="button"
            disabled={busy}
            onClick={selected.size === sessions.length ? clearSelection : selectAll}
            className="px-3 py-2 rounded-lg text-white/40 text-xs font-mono hover:text-white/60 transition-colors"
          >
            {selected.size === sessions.length ? "Clear selection" : "Select all"}
          </button>
        )}
      </div>
    </div>
  );
}
