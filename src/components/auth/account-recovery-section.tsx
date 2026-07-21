"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { anisurgeAuth, authFromMeResponse } from "@/lib/oauth/anisurge";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { RecoveryCodesReveal } from "@/components/auth/recovery-codes-reveal";

type RecoveryStatus = {
  passwordSet: boolean;
  remainingCodes: number;
};

export default function AccountRecoverySection() {
  const t = useT();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [busyPassword, setBusyPassword] = useState(false);
  const [busyCodes, setBusyCodes] = useState(false);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [me, codesRes] = await Promise.all([
        anisurgeAuth.me(),
        fetch("/api/account/auth/recovery-codes", withAuth()).then((r) =>
          r.ok ? r.json() : { remaining: 0 },
        ),
      ]);
      setAuth(authFromMeResponse(me));
      const user = (me.user ?? me) as Record<string, unknown>;
      setStatus({
        passwordSet: Boolean(me.passwordSet ?? user.passwordSet),
        remainingCodes: Number(codesRes.remaining ?? 0),
      });
    } catch {
      toast.error(t("settings.recoveryLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [setAuth, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const regenerateCodes = async () => {
    if (
      status &&
      status.remainingCodes > 0 &&
      !window.confirm(t("settings.recoveryCodesRegenConfirm"))
    ) {
      return;
    }
    setBusyCodes(true);
    try {
      const res = await fetch(
        "/api/account/auth/recovery-codes",
        withAuth({ method: "POST" }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? t("settings.recoveryCodesRegenFailed"));
        return;
      }
      setFreshCodes(Array.isArray(data.codes) ? data.codes : []);
      toast.success(t("settings.recoveryCodesRegenDone"));
      await refresh();
    } catch {
      toast.error(t("settings.recoveryCodesRegenFailed"));
    } finally {
      setBusyCodes(false);
    }
  };

  const savePassword = async () => {
    if (password.length < 8) {
      toast.error(t("auth.passwordMin"));
      return;
    }
    setBusyPassword(true);
    try {
      const res = await fetch(
        "/api/account/auth/set-password",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password,
            currentPassword: status?.passwordSet ? currentPassword : undefined,
          }),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? t("settings.passwordSaveFailed"));
        return;
      }
      toast.success(t("settings.passwordSaved"));
      setPassword("");
      setCurrentPassword("");
      await refresh();
    } catch {
      toast.error(t("settings.passwordSaveFailed"));
    } finally {
      setBusyPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground dark:text-white/40">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {t("settings.recoveryLoading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-[12px] text-muted-foreground dark:text-white/40 leading-relaxed">
        {t("settings.recoveryHintCodes")}
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground dark:text-white/35" />
          <p className="text-[12px] font-semibold text-foreground dark:text-white/80">
            {t("settings.recoveryCodesTitle")}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground dark:text-white/35">
          {t("settings.recoveryCodesRemaining", {
            count: status?.remainingCodes ?? 0,
          })}
        </p>
        {freshCodes ? (
          <RecoveryCodesReveal
            codes={freshCodes}
            onDismiss={() => setFreshCodes(null)}
          />
        ) : (
          <button
            type="button"
            disabled={busyCodes}
            onClick={() => void regenerateCodes()}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold",
              "site-brand-btn disabled:opacity-50",
            )}
          >
            {busyCodes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {(status?.remainingCodes ?? 0) > 0
              ? t("settings.recoveryCodesRegen")
              : t("settings.recoveryCodesGenerate")}
          </button>
        )}
      </div>

      <div className="space-y-3 border-t border-border dark:border-white/6 pt-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground dark:text-white/35" />
          <p className="text-[12px] font-semibold text-foreground dark:text-white/80">
            {status?.passwordSet
              ? t("settings.recoveryPasswordChange")
              : t("settings.recoveryPasswordSet")}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground dark:text-white/35">
          {status?.passwordSet
            ? t("settings.recoveryPasswordChangeHint")
            : t("settings.recoveryPasswordSetHint")}
        </p>
        {status?.passwordSet ? (
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t("settings.currentPassword")}
            autoComplete="current-password"
            className="w-full rounded-lg border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 px-3 py-2 text-[13px] text-foreground dark:text-white outline-none focus:border-border dark:focus:border-white/25"
          />
        ) : null}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("settings.newPassword")}
          autoComplete="new-password"
          className="w-full rounded-lg border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 px-3 py-2 text-[13px] text-foreground dark:text-white outline-none focus:border-border dark:focus:border-white/25"
        />
        <button
          type="button"
          disabled={busyPassword}
          onClick={() => void savePassword()}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold",
            "border border-border dark:border-white/12 bg-muted/50 dark:bg-white/5 text-foreground dark:text-white/80",
            "hover:bg-accent dark:hover:bg-white/10 disabled:opacity-50",
          )}
        >
          {busyPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {t("settings.recoveryPasswordSave")}
        </button>
      </div>
    </div>
  );
}
