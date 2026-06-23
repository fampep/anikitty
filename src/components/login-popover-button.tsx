"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { anisurgeAuth, setAnisurgeToken } from "@/lib/anisurge";

type View = "menu" | "login" | "signup";

function LoginPopoverButton() {
  const { setAuth } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [loading, setLoading] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const reset = () => {
    setView("menu");
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
    });
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      toast.error("Enter your username/email and password");
      return;
    }
    setLoading(true);
    try {
      const data = await anisurgeAuth.login(identifier.trim(), password);
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
    if (!/^[a-zA-Z0-9_]{3,25}$/.test(username.trim())) {
      toast.error("Username must be 3–25 characters (letters, numbers, underscores)");
      return;
    }
    setLoading(true);
    try {
      const data = await anisurgeAuth.signup(username.trim(), email.trim(), signupPassword);
      syncAuth(data);
      toast.success("Account created!");
      setOpen(false);
      reset();
    } catch (e: any) {
      const msg = e?.body?.error ?? "Signup failed";
      toast.error(
        msg.toLowerCase().includes("taken") || msg.toLowerCase().includes("409")
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
        className="p-0 bg-[#0a0a0a] border border-white/15 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
        style={{ width: "22rem" }}
      >
        {/* Menu */}
        {view === "menu" && (
          <div className="p-5 flex flex-col gap-3">
            <p className="text-center text-xs text-white/35 font-mono tracking-wider mb-1">
              sign in to KittyAnime
            </p>
            <button
              onClick={() => setView("login")}
              className="w-full py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
            <button
              onClick={() => setView("signup")}
              className="w-full py-2.5 rounded-lg border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create account
            </button>
          </div>
        )}

        {/* Login */}
        {view === "login" && (
          <div className="p-5 flex flex-col gap-3.5">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setView("menu")} className="text-white/35 hover:text-white/70 text-xs">← back</button>
              <p className="text-white/80 font-semibold text-sm">Login</p>
            </div>

            <Field
              label="Username or email"
              value={identifier}
              onChange={setIdentifier}
              placeholder="kittyuser"
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white hover:bg-white/90 disabled:opacity-60 text-black font-semibold text-sm transition-colors mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Login
            </button>
          </div>
        )}

        {/* Signup */}
        {view === "signup" && (
          <div className="p-5 flex flex-col gap-3.5">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setView("menu")} className="text-white/35 hover:text-white/70 text-xs">← back</button>
              <p className="text-white/80 font-semibold text-sm">Create account</p>
            </div>

            <Field
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="kittyuser (3–25 chars)"
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white hover:bg-white/90 disabled:opacity-60 text-black font-semibold text-sm transition-colors mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create account
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
        className="h-9 px-3 rounded-lg bg-white/5 border border-white/12 text-white/85 placeholder:text-white/20 text-sm focus:outline-none focus:border-white/30 transition-colors"
      />
    </div>
  );
}

export default LoginPopoverButton;
