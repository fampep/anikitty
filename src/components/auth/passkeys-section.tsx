"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { startRegistration } from "@simplewebauthn/browser";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { anisurgeAuth } from "@/lib/oauth/anisurge";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type PasskeyRow = {
  id: string;
  deviceName: string;
  deviceType: string | null;
  backedUp: boolean;
  lastUsedAt: string | null;
  createdAt: string | null;
};

function formatPasskeyDate(value: string | null, locale: string): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

export default function PasskeysSection() {
  const t = useT();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [deviceName, setDeviceName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const loadPasskeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await anisurgeAuth.listPasskeys();
      setPasskeys(data.passkeys ?? []);
    } catch {
      toast.error(t("settings.passkeysLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    loadPasskeys();
  }, [loadPasskeys]);

  const handleAdd = async () => {
    const name = deviceName.trim();
    if (!name) {
      toast.error(t("settings.passkeyNameRequired"));
      return;
    }

    setBusy(true);
    try {
      const { options, pendingToken } = await anisurgeAuth.passkeyRegisterOptions(name);
      const response = await startRegistration({ optionsJSON: options });
      await anisurgeAuth.passkeyRegisterVerify(pendingToken, response);
      toast.success(t("settings.passkeyAdded"));
      setDeviceName("");
      setShowAdd(false);
      await loadPasskeys();
    } catch (e: unknown) {
      const err = e as { name?: string; body?: { error?: string }; message?: string };
      if (err?.name === "NotAllowedError") {
        toast.error(t("settings.passkeyCancelled"));
      } else {
        toast.error(err?.body?.error ?? err?.message ?? t("settings.passkeyAddFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    setBusy(true);
    try {
      await anisurgeAuth.deletePasskey(id);
      toast.success(t("settings.passkeyRemoved"));
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      const err = e as { body?: { error?: string } };
      toast.error(err?.body?.error ?? t("settings.passkeyRemoveFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (supported === false) {
    return (
      <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono leading-relaxed">
        {t("settings.passkeysUnsupported")}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground dark:text-white/30 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t("settings.passkeysLoading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono leading-relaxed">
        {t("settings.passkeysHint")}
      </p>

      {passkeys.length > 0 && (
        <ul className="flex flex-col gap-2">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border dark:border-white/[0.08]"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-zinc-300">
                  <KeyRound className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground dark:text-white/85 truncate">{passkey.deviceName}</p>
                  <p className="text-[10px] font-mono text-muted-foreground dark:text-white/30 mt-0.5">
                    {t("settings.passkeyAddedAt")}{" "}
                    {formatPasskeyDate(passkey.createdAt, typeof navigator !== "undefined" ? navigator.language : "en")}
                    {passkey.lastUsedAt && (
                      <>
                        {" · "}
                        {t("settings.passkeyLastUsed")}{" "}
                        {formatPasskeyDate(passkey.lastUsedAt, typeof navigator !== "undefined" ? navigator.language : "en")}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(passkey.id)}
                disabled={busy}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/15 disabled:opacity-50 transition-colors"
                aria-label={t("settings.passkeyRemove")}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {t("settings.passkeyRemove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAdd ? (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-primary/20 bg-primary/[0.05]">
          <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-wider">
            {t("settings.passkeyNameLabel")}
          </label>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value.slice(0, 120))}
            placeholder={t("settings.passkeyNamePlaceholder")}
            className="h-10 px-3 rounded-xl bg-muted dark:bg-black/30 border border-border dark:border-white/10 text-foreground dark:text-white text-sm focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy || !deviceName.trim()}
              className="site-brand-btn disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              {t("settings.passkeyRegister")}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setDeviceName(""); }}
              className="site-ghost-btn"
            >
              {t("settings.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          disabled={busy}
          className={cn(
            "inline-flex items-center gap-2 self-start rounded-xl border border-border dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-3 py-2 text-sm font-semibold text-foreground/85 dark:text-white/75 hover:bg-accent dark:hover:bg-white/[0.08] disabled:opacity-50 transition-colors",
          )}
        >
          <Plus className="w-4 h-4" />
          {t("settings.passkeyAdd")}
        </button>
      )}
    </div>
  );
}
