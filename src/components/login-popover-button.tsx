"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, LogIn, UserPlus, Zap } from "lucide-react";
import { anisurgeAuth, setAnisurgeToken } from "@/lib/anisurge";

type Tab = "login" | "signup";

function LoginPopoverButton() {
  const { setAuth } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const reset = () => {
    setIdentifier("");
    setPassword("");
    setUsername("");
    setEmail("");
    setSignupPassword("");
    setLoading(false);
  };

  const syncAuth = (data: any) => {
    setAnisurgeToken(data.anisurgeToken);
    const user = data.user ?? {};
    setAuth({
      id: data.anisurgeUserId ?? user.externalUserId ?? "",
      username: user.username ?? "",
      email: user.email ?? "",
      avatar: user.customPfpUrl ?? user.avatarUrl ?? "",
      bannerUrl: user.bannerUrl ?? null,
      bio: user.bio ?? null,
      role: user.role ?? "user",
    });
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      toast.error("Enter your username/email and password");
      return;
    }
    setLoading(true);
    try {
      const data = await anisurgeAuth.loginWithAnisurge(identifier.trim(), password);
      syncAuth(data);
      toast.success("Welcome back!");
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error(e?.body?.error ?? "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !signupPassword) {
      toast.error("Fill in all fields");
      return;
    }
    if (!/^[a-zA-Z0-9]{3,10}$/.test(username.trim())) {
      toast.error("Username must be 3–10 alphanumeric characters");
      return;
    }
    setLoading(true);
    try {
      const data = await anisurgeAuth.signupWithAnisurge(username.trim(), email.trim(), signupPassword);
      syncAuth(data);
      toast.success("Account created!");
      setOpen(false);
      reset();
    } catch (e: any) {
      const msg = e?.body?.error ?? "Signup failed";
      toast.error(
        msg.toLowerCase().includes("taken") || e?.status === 409
          ? "Username or email already taken"
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-white/20 text-white/70 text-sm font-semibold hover:bg-white/10 hover:border-white/40 hover:text-white transition-all">
          <LogIn className="w-4 h-4" />
          Login
        </button>
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
            <p className="text-white/60 text-xs font-mono">powered by</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/12 border border-violet-500/20 text-violet-400/70">
              <Zap className="w-2.5 h-2.5" />
              Anisurge
            </span>
          </div>

          {/* Tabs */}
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
              Sign in
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
              Create account
            </button>
          </div>
        </div>

        {/* Login form */}
        {tab === "login" && (
          <div className="p-5 flex flex-col gap-3.5">
            <Field
              label="Username or email"
              value={identifier}
              onChange={setIdentifier}
              placeholder="your Anisurge username"
              onEnter={handleLogin}
            />
            <Field
              label="Password"
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
              Sign in with Anisurge
            </button>
          </div>
        )}

        {/* Signup form */}
        {tab === "signup" && (
          <div className="p-5 flex flex-col gap-3.5">
            <Field
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="3–10 alphanumeric"
              onEnter={handleSignup}
            />
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              onEnter={handleSignup}
            />
            <Field
              label="Password"
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
              Create Anisurge account
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
