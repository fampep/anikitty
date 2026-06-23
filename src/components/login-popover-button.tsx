"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { pb } from "@/lib/pocketbase";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { Check, Copy, Loader2, LogIn, RefreshCw, ShieldCheck } from "lucide-react";
import {
  generatePassphrase,
  normalizePassphrase,
  passphraseToCredentials,
} from "@/lib/passphrase";

type View = "menu" | "create" | "login";

function LoginPopoverButton() {
  const auth = useAuthStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [loading, setLoading] = useState(false);

  const [phrase, setPhrase] = useState("");
  useEffect(() => { setPhrase(generatePassphrase()); }, []);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const [input, setInput] = useState("");

  const resetState = () => {
    setView("menu");
    setPhrase(generatePassphrase());
    setSaved(false);
    setCopied(false);
    setInput("");
    setLoading(false);
  };

  const syncAuth = () => {
    const r = pb.authStore.record!;
    auth.setAuth({
      id: r.id,
      email: r.email,
      username: r.username,
      avatar: r.avatar,
      collectionId: r.collectionId,
      collectionName: r.collectionName,
      autoSkip: r.autoSkip ?? false,
      anilistUsername: r.anilistUsername ?? undefined,
    });
  };

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(phrase);
      } else {
        const ta = document.createElement("textarea");
        ta.value = phrase;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [phrase]);

  const handleCreate = async () => {
    if (!saved) {
      toast.error("Please confirm you've saved your passphrase");
      return;
    }
    setLoading(true);
    try {
      const creds = await passphraseToCredentials(phrase);
      await pb.collection("users").create({
        email: creds.email,
        password: creds.password,
        passwordConfirm: creds.password,
        username: creds.username,
        emailVisibility: false,
      });
      await pb.collection("users").authWithPassword(creds.email, creds.password);
      syncAuth();
      toast.success("Account created! Keep your passphrase safe.");
      setOpen(false);
      resetState();
    } catch (e: any) {
      const msg = e?.response?.data?.email?.message ?? e?.message;
      if (msg?.includes("already exists") || msg?.includes("unique")) {
        toast.error("That passphrase is already in use. Generate a new one.");
      } else {
        toast.error(msg ?? "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const normalized = normalizePassphrase(input);
    if (normalized.split(" ").length < 4) {
      toast.error("Enter your full passphrase");
      return;
    }
    setLoading(true);
    try {
      const creds = await passphraseToCredentials(normalized);
      await pb.collection("users").authWithPassword(creds.email, creds.password);
      syncAuth();
      toast.success("Welcome back!");
      setOpen(false);
      resetState();
    } catch {
      toast.error("Passphrase not recognised. Check spelling and spacing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetState();
      }}
    >
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-white/20 text-white/70 text-sm font-semibold hover:bg-white/10 hover:border-white/40 hover:text-white transition-all">
          <LogIn className="w-4 h-4" />
          Login
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-84 mt-2 p-0 bg-[#0a0a0a] border border-white/15 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
        style={{ width: "22rem" }}
      >
        {/* ── Menu ──────────────────────────────────────────────── */}
        {view === "menu" && (
          <div className="p-5 flex flex-col gap-3">
            <p className="text-center text-xs text-white/35 font-mono tracking-wider mb-1">
              sign in to KittyAnime
            </p>
            <button
              onClick={() => setView("create")}
              className="w-full py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors"
            >
              Create account
            </button>
            <button
              onClick={() => setView("login")}
              className="w-full py-2.5 rounded-lg border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-semibold text-sm transition-colors"
            >
              I already have a passphrase
            </button>
            <p className="text-center text-[10px] text-white/20 font-mono mt-1">
              No email required
            </p>
          </div>
        )}

        {/* ── Create account ────────────────────────────────────── */}
        {view === "create" && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("menu")}
                className="text-white/35 hover:text-white/70 text-xs"
              >
                ← back
              </button>
              <p className="text-white/80 font-semibold text-sm">Your passphrase</p>
            </div>

            <p className="text-[11px] text-white/40 leading-relaxed">
              This passphrase <em>is</em> your account — it&apos;s your username and
              password in one. Write it down and keep it safe. There is no recovery.
            </p>

            <div className="rounded-lg border border-white/12 bg-white/5 p-3">
              <div className="flex flex-wrap gap-1.5">
                {phrase.split(" ").map((word, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/12 text-white/80 text-xs font-mono"
                  >
                    <span className="text-white/30 text-[9px]">{i + 1}</span>
                    {word}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/15 hover:border-white/30 text-white/55 hover:text-white/80 text-xs font-semibold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => { setPhrase(generatePassphrase()); setSaved(false); setCopied(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/15 hover:border-white/30 text-white/55 hover:text-white/80 text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New phrase
              </button>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setSaved((s) => !s)}
                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  saved
                    ? "bg-white border-white"
                    : "border-white/25 bg-transparent"
                }`}
              >
                {saved && <Check className="w-2.5 h-2.5 text-black" />}
              </div>
              <span className="text-xs text-white/40 leading-tight">
                I&apos;ve saved my passphrase. I understand it cannot be recovered.
              </span>
            </label>

            <button
              onClick={handleCreate}
              disabled={loading || !saved}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <ShieldCheck className="w-4 h-4" />
              Create account
            </button>
          </div>
        )}

        {/* ── Login ─────────────────────────────────────────────── */}
        {view === "login" && (
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("menu")}
                className="text-white/35 hover:text-white/70 text-xs"
              >
                ← back
              </button>
              <p className="text-white/80 font-semibold text-sm">Enter passphrase</p>
            </div>

            <p className="text-[11px] text-white/40">
              Type or paste your 12-word passphrase. Words separated by spaces.
            </p>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleLogin();
                }
              }}
              placeholder="word word word word word word word word word word word word"
              rows={3}
              className="w-full resize-none rounded-lg border border-white/15 bg-white/5 text-white/85 placeholder:text-white/20 text-sm font-mono p-3 focus:outline-none focus:border-white/30 leading-relaxed"
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white hover:bg-white/90 disabled:opacity-60 text-black font-semibold text-sm transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Login
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default LoginPopoverButton;
