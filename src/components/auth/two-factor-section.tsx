"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { anisurgeAuth } from "@/lib/oauth/anisurge";
import { cn } from "@/lib/core/utils";

type SetupData = {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
};

export default function TwoFactorSection() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await anisurgeAuth.get2faStatus();
      setEnabled(data.enabled);
    } catch {
      toast.error("Could not load 2FA status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setBusy(true);
    try {
      const data = await anisurgeAuth.setup2fa();
      setSetup(data);
      setCode("");
    } catch (e: unknown) {
      const err = e as { body?: { error?: string } };
      toast.error(err?.body?.error ?? "Could not start 2FA setup");
    } finally {
      setBusy(false);
    }
  };

  const confirmEnable = async () => {
    if (!code.trim()) {
      toast.error("Enter the 6-digit code from your app");
      return;
    }
    setBusy(true);
    try {
      await anisurgeAuth.enable2fa(code.trim());
      toast.success("Two-factor authentication enabled");
      setSetup(null);
      setCode("");
      setEnabled(true);
    } catch (e: unknown) {
      const err = e as { body?: { error?: string } };
      toast.error(err?.body?.error ?? "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    if (!code.trim()) {
      toast.error("Enter your current 6-digit code");
      return;
    }
    setBusy(true);
    try {
      await anisurgeAuth.disable2fa(code.trim());
      toast.success("Two-factor authentication disabled");
      setCode("");
      setEnabled(false);
      setSetup(null);
    } catch (e: unknown) {
      const err = e as { body?: { error?: string } };
      toast.error(err?.body?.error ?? "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!setup?.secret) return;
    await navigator.clipboard.writeText(setup.secret);
    setCopied(true);
    toast.success("Secret copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground dark:text-white/30 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading security settings…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border dark:border-white/[0.08]">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-muted/60 dark:bg-white/[0.05] text-muted-foreground dark:text-white/40",
            )}
          >
            {enabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground dark:text-white/85">
              {enabled ? "Two-factor authentication is on" : "Two-factor authentication is off"}
            </p>
            <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono mt-1 leading-relaxed">
              {enabled
                ? "Your account requires a code from an authenticator app when signing in."
                : "Add an extra layer of security with Google Authenticator, Authy, or similar apps."}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border",
            enabled
              ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
              : "text-muted-foreground dark:text-white/35 border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03]",
          )}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {setup && !enabled && (
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.05]">
          <p className="text-sm font-medium text-foreground/90 dark:text-white/80">Scan this QR code with your authenticator app</p>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="rounded-xl bg-white p-2 shrink-0">
              <Image src={setup.qrDataUrl} alt="2FA QR code" width={160} height={160} unoptimized />
            </div>
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground dark:text-white/40 font-mono">Or enter this secret manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-violet-200/90 bg-muted dark:bg-black/30 border border-border dark:border-white/10 rounded-lg px-3 py-2 break-all">
                  {setup.secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-2 rounded-lg border border-border dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] hover:bg-accent dark:hover:bg-white/[0.08] text-muted-foreground dark:text-white/60"
                  aria-label="Copy secret"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-wider">
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="h-10 px-3 rounded-xl bg-muted dark:bg-black/30 border border-border dark:border-white/10 text-foreground dark:text-white text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmEnable}
              disabled={busy || code.length !== 6}
              className="site-brand-btn disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enable 2FA"}
            </button>
            <button
              type="button"
              onClick={() => { setSetup(null); setCode(""); }}
              className="site-ghost-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!setup && !enabled && (
        <button
          type="button"
          onClick={startSetup}
          disabled={busy}
          className="site-brand-btn self-start disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set up authenticator app"}
        </button>
      )}

      {enabled && (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-border dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.02]">
          <p className="text-sm text-muted-foreground dark:text-white/60">Enter a code from your authenticator app to turn off 2FA.</p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="h-10 px-3 rounded-xl bg-muted dark:bg-black/30 border border-border dark:border-white/10 text-foreground dark:text-white text-center text-lg tracking-[0.3em] font-mono focus:outline-none focus:border-rose-400/40 focus:ring-2 focus:ring-rose-500/20"
          />
          <button
            type="button"
            onClick={disable2fa}
            disabled={busy || code.length !== 6}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
          </button>
        </div>
      )}
    </div>
  );
}
