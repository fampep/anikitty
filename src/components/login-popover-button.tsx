"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, LogIn, UserPlus, Zap, ShieldCheck } from "lucide-react";
import { anisurgeAuth, authFromMeResponse } from "@/lib/anisurge";
import { useT } from "@/providers/i18n-provider";

type Tab = "login" | "signup" | "2fa";

function LoginPopoverButton({ customTrigger }: { customTrigger?: React.ReactNode } = {}) {
  const t = useT();
  const { setAuth } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const reset = () => {
    setIdentifier("");
    setPassword("");
    setUsername("");
    setEmail("");
    setSignupPassword("");
    setPendingToken("");
    setTotpCode("");
    setLoading(false);
  };

  const syncAuth = (data: Record<string, unknown>) => {
    setAuth(authFromMeResponse(data));
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      toast.error(t("auth.enterCredentials"));
      return;
    }
    setLoading(true);
    try {
      const data = await anisurgeAuth.loginWithAnisurge(identifier.trim(), password);
      if (data.requires2fa && data.pendingToken) {
        setPendingToken(data.pendingToken);
        setTab("2fa");
        setTotpCode("");
        return;
      }
      syncAuth(data);
      toast.success(t("auth.welcomeBack"));
      setOpen(false);
      reset();
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
      const data = await anisurgeAuth.verify2fa(pendingToken, totpCode);
      syncAuth(data);
      toast.success(t("auth.welcomeBack"));
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error(e?.body?.error ?? t("auth.invalidTotp"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !signupPassword) {
      toast.error(t("auth.fillAllFields"));
      return;
    }
    if (!/^[a-zA-Z0-9]{3,10}$/.test(username.trim())) {
      toast.error(t("auth.usernameRules"));
      return;
    }
    setLoading(true);
    try {
      const data = await anisurgeAuth.signupWithAnisurge(username.trim(), email.trim(), signupPassword);
      syncAuth(data);
      toast.success(t("auth.accountCreated"));
      setOpen(false);
      reset();
    } catch (e: any) {
      const msg = e?.body?.error ?? t("auth.signupFailed");
      toast.error(
        msg.toLowerCase().includes("taken") || e?.status === 409
          ? t("auth.usernameTaken")
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <PopoverTrigger asChild>
        {customTrigger ? (
          <span>{customTrigger}</span>
        ) : (
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-white/20 text-white/70 text-sm font-semibold hover:bg-white/10 hover:border-white/40 hover:text-white transition-all">
            <LogIn className="w-4 h-4" />
            {t("auth.login")}
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="p-0 bg-[#0a0a0a] border border-white/12 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
        style={{ width: "22rem" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-xs font-mono">{t("auth.poweredBy")}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/12 border border-violet-500/20 text-violet-400/70">
              <Zap className="w-2.5 h-2.5" />
              {t("nav.anisurge")}
            </span>
          </div>

          {/* Tabs */}
          {tab !== "2fa" && (
          <div className="flex rounded-lg bg-white/[0.04] border border-white/8 p-0.5">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === "login"
                  ? "bg-white/10 text-white border border-white/12"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              {t("auth.signIn")}
            </button>
            <button
              onClick={() => setTab("signup")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                tab === "signup"
                  ? "bg-white/10 text-white border border-white/12"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              {t("auth.createAccount")}
            </button>
          </div>
          )}
        </div>

        {tab === "2fa" && (
          <div className="p-5 flex flex-col gap-3.5">
            <div className="flex items-center gap-2 text-violet-300/80">
              <ShieldCheck className="w-4 h-4" />
              <p className="text-sm font-semibold text-white/85">{t("auth.twoFactor")}</p>
            </div>
            <p className="text-[11px] text-white/40 font-mono leading-relaxed">
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {t("auth.verifySignIn")}
            </button>
            <button
              type="button"
              onClick={() => { setTab("login"); setPendingToken(""); setTotpCode(""); }}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              {t("auth.backToSignIn")}
            </button>
          </div>
        )}

        {/* Login form */}
        {tab === "login" && (
          <div className="p-5 flex flex-col gap-3.5">
            <Field
              label={t("auth.usernameOrEmail")}
              value={identifier}
              onChange={setIdentifier}
              placeholder={t("auth.usernamePlaceholder")}
              onEnter={handleLogin}
            />
            <Field
              label={t("auth.password")}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
              onEnter={handleLogin}
            />
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {t("auth.signInAnisurge")}
            </button>
          </div>
        )}

        {/* Signup form */}
        {tab === "signup" && (
          <div className="p-5 flex flex-col gap-3.5">
            <Field
              label={t("auth.username")}
              value={username}
              onChange={setUsername}
              placeholder={t("auth.usernameHint")}
              onEnter={handleSignup}
            />
            <Field
              label={t("auth.email")}
              value={email}
              onChange={setEmail}
              placeholder={t("auth.emailPlaceholder")}
              type="email"
              onEnter={handleSignup}
            />
            <Field
              label={t("auth.password")}
              value={signupPassword}
              onChange={setSignupPassword}
              placeholder="••••••••"
              type="password"
              onEnter={handleSignup}
            />
            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {t("auth.createAnisurge")}
            </button>
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
      <label className="text-[11px] font-mono text-white/40 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        placeholder={placeholder}
        autoComplete={type === "password" ? "current-password" : type === "email" ? "email" : "username"}
        className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white/85 placeholder:text-white/20 text-sm focus:outline-none focus:border-white/28 transition-colors"
      />
    </div>
  );
}

export default LoginPopoverButton;
