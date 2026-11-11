"use client";

import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, LogIn, UserPlus, ShieldCheck, Fingerprint } from "lucide-react";
import { accountAuth, authFromMeResponse } from "@/lib/oauth/account";
import { useT } from "@/providers/i18n-provider";
import { DiscordIcon } from "@/components/auth/discord-connect";
import AnilistIcon from "@/icons/anilist";
import { useDiscordAuthEnabled } from "@/hooks/use-discord-auth-enabled";
import { useOpenSignups } from "@/hooks/use-open-signups";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import TelegramIcon from "@/icons/telegram";
import { trackEvent } from "@/lib/analytics";
import { usePendingPassphraseStore } from "@/store/pending-passphrase-store";
import {
  readCurrentNextParam,
  safeInternalNextPath,
  stashOAuthNextPath,
  takeStashedOAuthNextPath,
} from "@/lib/auth/safe-next-path";

type Tab = "login" | "signup" | "2fa" | "recover";

function LoginPopoverButton({
  customTrigger,
  defaultTab = "login",
}: {
  customTrigger?: React.ReactNode;
  defaultTab?: "login" | "signup";
} = {}) {
  const t = useT();
  const { setAuth } = useAuthStore();
  const setPendingPassphrase = usePendingPassphraseStore((s) => s.setPassphrase);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [loading, setLoading] = useState(false);

  const [passphrase, setPassphrase] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [showPassphraseLogin, setShowPassphraseLogin] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [recoverIdentifier, setRecoverIdentifier] = useState("");
  const [recoverCode, setRecoverCode] = useState("");
  const [recoverPassword, setRecoverPassword] = useState("");

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
  }, []);

  const reset = () => {
    setPassphrase("");
    setIdentifier("");
    setPassword("");
    setPendingToken("");
    setTotpCode("");
    setShowPassphraseLogin(false);
    setShowPasswordLogin(false);
    setRecoverIdentifier("");
    setRecoverCode("");
    setRecoverPassword("");
    setLoading(false);
  };

  const syncAuth = (data: Record<string, unknown>) => {
    setAuth(authFromMeResponse(data));
  };

  const redirectAfterAuth = () => {
    if (typeof window === "undefined") return;
    const next =
      readCurrentNextParam() ??
      takeStashedOAuthNextPath() ??
      (window.location.pathname === "/" ? safeInternalNextPath("/home") : null);
    if (next) window.location.assign(next);
  };

  const finishAuth = (data: Record<string, unknown>) => {
    syncAuth(data);
    toast.success(t("auth.welcomeBack"));
    setOpen(false);
    reset();
    redirectAfterAuth();
  };

  const handlePassphraseLogin = async () => {
    if (!passphrase.trim()) {
      toast.error(t("auth.enterPassphrase"));
      return;
    }
    setLoading(true);
    try {
      const data = await accountAuth.loginWithPassphrase(passphrase.trim());
      if (data.requires2fa && data.pendingToken) {
        setPendingToken(data.pendingToken);
        setTab("2fa");
        setTotpCode("");
        return;
      }
      finishAuth(data);
    } catch (e: any) {
      toast.error(e?.body?.error ?? t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password) {
      toast.error(t("auth.enterCredentials"));
      return;
    }
    setLoading(true);
    try {
      const data = await accountAuth.login(identifier.trim(), password);
      if (data.requires2fa && data.pendingToken) {
        setPendingToken(data.pendingToken);
        setTab("2fa");
        setTotpCode("");
        return;
      }
      finishAuth(data);
    } catch (e: any) {
      toast.error(e?.body?.error ?? t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handle2fa = async () => {
    if (!pendingToken || totpCode.length !== 6) {
      toast.error(t("auth.enterTotp"));
      return;
    }
    setLoading(true);
    try {
      const data = await accountAuth.verify2fa(pendingToken, totpCode);
      finishAuth(data);
    } catch (e: any) {
      toast.error(e?.body?.error ?? t("auth.invalidTotp"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      const data = await accountAuth.signupWithPassphrase();
      const phrase =
        typeof (data as { passphrase?: string }).passphrase === "string"
          ? (data as { passphrase: string }).passphrase
          : null;
      toast.success(t("auth.accountCreated"));
      if (phrase) {
        // Root modal shows the secret — set it BEFORE syncAuth so parents can
        // unmount this popover without losing the passphrase.
        setPendingPassphrase(phrase);
        setOpen(false);
        reset();
        syncAuth(data as Record<string, unknown>);
      } else {
        finishAuth(data as Record<string, unknown>);
      }
    } catch (e: any) {
      if (e?.status === 403 || e?.body?.code === "signups_closed") {
        toast.error(t("auth.signupsClosedToast"));
        setTab("login");
        return;
      }
      toast.error(e?.body?.error ?? t("auth.signupFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async () => {
    if (!recoverIdentifier.trim() || !recoverCode.trim() || !recoverPassword) {
      toast.error(t("auth.recoverFillAll"));
      return;
    }
    if (recoverPassword.length < 8) {
      toast.error(t("auth.passwordMin"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: recoverIdentifier.trim(),
          code: recoverCode.trim(),
          password: recoverPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? t("auth.recoverFailed"));
        return;
      }
      finishAuth(data);
    } catch {
      toast.error(t("auth.recoverFailed"));
    } finally {
      setLoading(false);
    }
  };

  const discordEnabled = useDiscordAuthEnabled();
  const { open: openSignups, telegramUrl, loaded: signupStatusLoaded } = useOpenSignups();

  useEffect(() => {
    if (!signupStatusLoaded) return;
    if (!openSignups && tab === "signup") setTab("login");
  }, [signupStatusLoaded, openSignups, tab]);

  const startOAuth = (href: string) => {
    stashOAuthNextPath(readCurrentNextParam());
    window.location.href = href;
  };

  const handleDiscordLogin = () => startOAuth("/api/account/auth/discord/start");
  const handleAniListLogin = () => startOAuth("/api/auth/anilist/start");

  const handlePasskeyLogin = async () => {
    setLoading(true);
    try {
      const { options, pendingToken: token } = await accountAuth.passkeyLoginOptions();
      const response = await startAuthentication({ optionsJSON: options });
      const data = await accountAuth.passkeyLoginVerify(token, response);
      if (data.requires2fa && data.pendingToken) {
        setPendingToken(data.pendingToken);
        setTab("2fa");
        setTotpCode("");
        return;
      }
      finishAuth(data);
    } catch (e: unknown) {
      const err = e as { name?: string; body?: { error?: string }; message?: string };
      if (err?.name === "NotAllowedError") {
        toast.error(t("auth.passkeyCancelled"));
      } else {
        toast.error(err?.body?.error ?? err?.message ?? t("auth.passkeyFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          const next =
            defaultTab === "signup" && signupStatusLoaded && !openSignups
              ? "login"
              : defaultTab;
          setTab(next);
        } else reset();
      }}
    >
      <PopoverTrigger asChild>
        {customTrigger ? (
          <span>{customTrigger}</span>
        ) : (
          <button className="flex items-center gap-2 min-h-11 px-3 sm:px-4 py-2 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-accent hover:border-primary/40 hover:text-foreground transition-all dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10 dark:hover:border-white/40 dark:hover:text-white">
            <LogIn className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t("auth.login")}</span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        collisionPadding={16}
        className="p-0 w-[min(22rem,calc(100vw-2rem))] bg-[#0a0a0a] border border-border dark:border-white/12 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        <div className="px-5 pt-5 pb-0 flex flex-col gap-3">
          <p className="text-muted-foreground dark:text-white/50 text-xs font-mono">
            {t("auth.accountHint")}
          </p>

          {tab !== "2fa" && tab !== "recover" && openSignups && (
            <div className="flex rounded-lg bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/8 p-0.5">
              <button
                onClick={() => setTab("login")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tab === "login"
                    ? "bg-accent dark:bg-white/10 text-white border border-border dark:border-white/12"
                    : "text-muted-foreground dark:text-white/35 hover:text-white/60"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                {t("auth.signIn")}
              </button>
              <button
                onClick={() => setTab("signup")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tab === "signup"
                    ? "bg-accent dark:bg-white/10 text-white border border-border dark:border-white/12"
                    : "text-muted-foreground dark:text-white/35 hover:text-white/60"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t("auth.createAccount")}
              </button>
            </div>
          )}

          {tab !== "2fa" && tab !== "recover" && signupStatusLoaded && !openSignups && (
            <div className="rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-sky-100/85 font-mono">
              <p className="mb-2">{t("auth.signupsClosedHint")}</p>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("auth_signups_closed_telegram")}
                className="inline-flex items-center gap-1.5 font-semibold text-sky-100 hover:text-white transition-colors"
              >
                <TelegramIcon className="h-3.5 w-3.5" />
                {t("auth.joinTelegram")}
              </a>
            </div>
          )}
        </div>

        {tab === "2fa" && (
          <div className="p-5 flex flex-col gap-3.5">
            <div className="flex items-center gap-2 text-zinc-300/80">
              <ShieldCheck className="w-4 h-4" />
              <p className="text-sm font-semibold text-foreground dark:text-white/85">
                {t("auth.twoFactor")}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground dark:text-white/40 font-mono leading-relaxed">
              {t("auth.twoFactorHint")}
            </p>
            <Field
              label={t("auth.authCode")}
              value={totpCode}
              onChange={(v) => setTotpCode(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              onEnter={handle2fa}
            />
            <button
              onClick={handle2fa}
              disabled={loading || totpCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold text-sm transition-colors mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {t("auth.verifySignIn")}
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setPendingToken("");
                setTotpCode("");
              }}
              className="text-xs text-muted-foreground dark:text-white/40 hover:text-white/70 transition-colors"
            >
              {t("auth.backToSignIn")}
            </button>
          </div>
        )}

        {tab === "login" && (
          <div className="p-5 flex flex-col gap-3.5">
            {passkeySupported ? (
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold text-sm transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Fingerprint className="w-4 h-4" />
                )}
                {t("auth.signInWithPasskey")}
              </button>
            ) : (
              <p className="text-[11px] text-muted-foreground dark:text-white/40 font-mono leading-relaxed">
                {t("auth.passkeyUnsupported")}
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowPassphraseLogin((v) => !v)}
              className="self-start text-[11px] text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/70 transition-colors"
            >
              {showPassphraseLogin ? t("auth.hidePassphraseLogin") : t("auth.usePassphrase")}
            </button>

            {(showPassphraseLogin || !passkeySupported) && (
              <>
                <Field
                  label={t("auth.passphrase")}
                  value={passphrase}
                  onChange={setPassphrase}
                  placeholder={t("auth.passphrasePlaceholder")}
                  onEnter={handlePassphraseLogin}
                />
                <button
                  onClick={handlePassphraseLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent dark:bg-white/[0.06] border border-border dark:border-white/12 text-foreground dark:text-white/85 font-semibold text-sm hover:bg-accent dark:hover:bg-white/10 disabled:opacity-60 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {t("auth.signInWithPassphrase")}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowPasswordLogin((v) => !v)}
              className="self-start text-[11px] text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/70 transition-colors"
            >
              {showPasswordLogin ? t("auth.hidePasswordLogin") : t("auth.usePasswordLogin")}
            </button>

            {showPasswordLogin && (
              <>
                <Field
                  label={t("auth.usernameOrEmail")}
                  value={identifier}
                  onChange={setIdentifier}
                  placeholder={t("auth.usernamePlaceholder")}
                  onEnter={handlePasswordLogin}
                />
                <Field
                  label={t("auth.password")}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  type="password"
                  onEnter={handlePasswordLogin}
                />
                <button
                  type="button"
                  onClick={() => {
                    setRecoverIdentifier(identifier);
                    setTab("recover");
                  }}
                  className="self-start -mt-1 text-[11px] text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/70 transition-colors"
                >
                  {t("auth.useRecoveryCode")}
                </button>
                <button
                  onClick={handlePasswordLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent dark:bg-white/[0.06] border border-border dark:border-white/12 text-foreground dark:text-white/85 font-semibold text-sm hover:bg-accent dark:hover:bg-white/10 disabled:opacity-60 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {t("auth.signInSubmit")}
                </button>
              </>
            )}

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-accent dark:bg-white/8" />
              <span className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase">
                {t("auth.or")}
              </span>
              <div className="h-px flex-1 bg-accent dark:bg-white/8" />
            </div>
            <button
              type="button"
              onClick={handleAniListLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#0e1e7a]/20 border border-[#3c5aa6]/40 text-[#7eb3ff] font-semibold text-sm hover:bg-[#0e1e7a]/30 disabled:opacity-60 transition-colors"
            >
              <AnilistIcon className="w-4 h-4" />
              {t("auth.continueWithAniList")}
            </button>
            {discordEnabled && (
              <button
                type="button"
                onClick={handleDiscordLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#5865F2]/15 border border-[#5865F2]/30 text-[#dce0ff] font-semibold text-sm hover:bg-[#5865F2]/25 disabled:opacity-60 transition-colors"
              >
                <DiscordIcon className="w-4 h-4" />
                {t("auth.continueWithDiscord")}
              </button>
            )}
          </div>
        )}

        {tab === "recover" && (
          <div className="p-5 flex flex-col gap-3.5">
            <p className="text-[11px] text-muted-foreground dark:text-white/40 font-mono leading-relaxed">
              {t("auth.recoverHint")}
            </p>
            <Field
              label={t("auth.usernameOrEmail")}
              value={recoverIdentifier}
              onChange={setRecoverIdentifier}
              placeholder={t("auth.usernamePlaceholder")}
              onEnter={handleRecover}
            />
            <Field
              label={t("auth.recoveryCode")}
              value={recoverCode}
              onChange={setRecoverCode}
              placeholder="XXXX-XXXX"
              onEnter={handleRecover}
            />
            <Field
              label={t("settings.newPassword")}
              value={recoverPassword}
              onChange={setRecoverPassword}
              placeholder="••••••••"
              type="password"
              onEnter={handleRecover}
            />
            <button
              onClick={handleRecover}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold text-sm transition-colors mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("auth.recoverSubmit")}
            </button>
            <button
              type="button"
              onClick={() => setTab("login")}
              className="text-xs text-muted-foreground dark:text-white/40 hover:text-white/70 transition-colors"
            >
              {t("auth.backToSignIn")}
            </button>
          </div>
        )}

        {tab === "signup" && openSignups && (
          <div className="p-5 flex flex-col gap-3.5">
            <p className="text-[11px] text-muted-foreground dark:text-white/40 font-mono leading-relaxed">
              {t("auth.passphraseSignupHint")}
            </p>
            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {t("auth.createPassphraseAccount")}
            </button>
            <p className="text-[10px] text-muted-foreground/80 dark:text-white/30 leading-relaxed">
              {t("auth.passphraseSignupNote")}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  onEnter?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        placeholder={placeholder}
        autoComplete={type === "password" ? "current-password" : "off"}
        className="h-9 px-3 rounded-lg bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 text-foreground dark:text-white/85 placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 text-sm focus:outline-none focus:border-white/28 transition-colors"
      />
    </div>
  );
}

export default LoginPopoverButton;
