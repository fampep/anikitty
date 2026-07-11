"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

const DELETE_PHRASE = "DELETE MY ACCOUNT";

type DeletionRequest = {
  id: string;
  requestedAt: string | null;
  reason: string | null;
};

type DeleteMode = "instant" | "request";

export default function AccountDeletionSection() {
  const t = useT();
  const { auth, clearAuth } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<DeletionRequest | null>(null);
  const [mode, setMode] = useState<DeleteMode>("instant");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [password, setPassword] = useState("");

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
      toast.error(t("settings.accountDeletionLoadError"));
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setConfirmText("");
    setConfirmPhrase("");
    setPassword("");
    setReason("");
  };

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
      resetForm();
      toast.success(t("settings.accountDeletionRequestSuccess"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not submit request");
    } finally {
      setBusy(false);
    }
  };

  const deleteInstantly = async () => {
    if (confirmText !== auth?.username) {
      toast.error(`Type your username (${auth?.username}) to confirm`);
      return;
    }
    if (confirmPhrase !== DELETE_PHRASE) {
      toast.error(`Type "${DELETE_PHRASE}" to confirm`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        "/api/account/delete",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmUsername: confirmText,
            confirmPhrase,
            password: password || undefined,
          }),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Deletion failed");
      clearAuth();
      toast.success(t("settings.accountDeletionSuccess"));
      router.push("/");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not delete account");
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
      toast.success(t("settings.accountDeletionCancelSuccess"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not cancel request");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground dark:text-white/35 text-sm py-2">
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
            <p className="text-sm font-semibold text-amber-200/90">{t("settings.accountDeletionPendingTitle")}</p>
            <p className="text-xs text-muted-foreground dark:text-white/45 mt-1 leading-relaxed">
              {t("settings.accountDeletionPendingDesc")}
            </p>
            {pending.requestedAt && (
              <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 mt-2">
                Requested {new Date(pending.requestedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={cancelRequest}
          disabled={busy}
          className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border dark:border-white/12 text-xs text-muted-foreground dark:text-white/60 hover:text-foreground dark:text-white hover:bg-muted/50 dark:bg-white/5 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {t("settings.accountDeletionCancel")}
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
          <p className="text-sm font-semibold text-foreground dark:text-white/85">{t("settings.accountDeletionTitle")}</p>
          <p className="text-xs text-muted-foreground dark:text-white/40 mt-1 leading-relaxed">
            {t("settings.accountDeletionDesc")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("instant")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
            mode === "instant"
              ? "bg-red-500/10 border-red-500/30 text-red-200"
              : "border-border dark:border-white/10 text-muted-foreground dark:text-white/45",
          )}
        >
          {t("settings.accountDeletionInstant")}
        </button>
        <button
          type="button"
          onClick={() => setMode("request")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
            mode === "request"
              ? "bg-accent dark:bg-white/10 border-border dark:border-white/15 text-foreground dark:text-white"
              : "border-border dark:border-white/10 text-muted-foreground dark:text-white/45",
          )}
        >
          {t("settings.accountDeletionRequest")}
        </button>
      </div>

      {mode === "instant" && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-3 flex gap-2">
          <ShieldAlert className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-200/80 leading-relaxed">
            {t("settings.accountDeletionInstantWarning")}
          </p>
        </div>
      )}

      {mode === "request" && (
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest">
            {t("settings.accountDeletionReason")}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("settings.accountDeletionReasonPlaceholder")}
            rows={2}
            maxLength={500}
            className="resize-none rounded-xl px-3 py-2 text-sm bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/15"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest">
          {t("settings.accountDeletionConfirmUsername", { username: auth?.username ?? "" })}
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={auth?.username ?? "username"}
          className="rounded-xl px-3 py-2 text-sm bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/15"
        />
      </div>

      {mode === "instant" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest">
              {t("settings.accountDeletionConfirmPhrase", { phrase: DELETE_PHRASE })}
            </label>
            <input
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder={DELETE_PHRASE}
              className="rounded-xl px-3 py-2 text-sm bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/15"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest">
              {t("settings.accountDeletionPassword")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("settings.accountDeletionPasswordPlaceholder")}
              className="rounded-xl px-3 py-2 text-sm bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/15"
            />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={mode === "instant" ? deleteInstantly : submitRequest}
        disabled={busy || confirmText !== auth?.username || (mode === "instant" && confirmPhrase !== DELETE_PHRASE)}
        className={cn(
          "self-start inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border disabled:opacity-40",
          "bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/15",
        )}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        {mode === "instant" ? t("settings.accountDeletionSubmitInstant") : t("settings.accountDeletionSubmitRequest")}
      </button>
    </div>
  );
}
