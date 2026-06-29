"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/core/utils";

type DeletionRequest = {
  id: string;
  requestedAt: string | null;
  reason: string | null;
};

export default function AccountDeletionSection() {
  const { auth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<DeletionRequest | null>(null);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const load = useCallback(async () => {
    if (!auth) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/deletion-request", withAuth());
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setPending(data.request ?? null);
    } catch {
      toast.error("Could not load deletion request status");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const submitRequest = async () => {
    if (confirmText !== auth?.username) {
      toast.error(`Type your username (${auth?.username}) to confirm`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        "/api/account/deletion-request",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || null }),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setPending(data.request);
      setConfirmText("");
      setReason("");
      toast.success("Deletion request submitted — an admin will process it");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not submit request");
    } finally {
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        "/api/account/deletion-request",
        withAuth({ method: "DELETE" }),
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Cancel failed");
      }
      setPending(null);
      toast.success("Deletion request cancelled");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not cancel request");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/35 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (pending) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-200/90">Deletion requested</p>
            <p className="text-xs text-white/45 mt-1 leading-relaxed">
              An admin will review and permanently delete your account. This removes your watchlist,
              progress, comments, forum posts, and profile.
            </p>
            {pending.requestedAt && (
              <p className="text-[10px] font-mono text-white/25 mt-2">
                Requested {new Date(pending.requestedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={cancelRequest}
          disabled={busy}
          className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/12 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Cancel request
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border border-red-500/20 bg-red-500/[0.06] text-red-300/80">
          <Trash2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/85">Delete account</p>
          <p className="text-xs text-white/40 mt-1 leading-relaxed">
            Request permanent deletion of your account and all associated data. An admin will
            process the request — this cannot be undone once completed.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you leaving? (optional)"
          rows={2}
          maxLength={500}
          className="resize-none rounded-xl px-3 py-2 text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/15"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
          Type <span className="text-white/50">{auth?.username}</span> to confirm
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={auth?.username ?? "username"}
          className="rounded-xl px-3 py-2 text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/15"
        />
      </div>

      <button
        type="button"
        onClick={submitRequest}
        disabled={busy || confirmText !== auth?.username}
        className={cn(
          "self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border disabled:opacity-40",
          "bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/15",
        )}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Request account deletion
      </button>
    </div>
  );
}
