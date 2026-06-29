"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Users, Tv, ArrowRight, Loader2, LogIn } from "lucide-react";
import Container from "@/components/layout/container";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";
import { w2gApi, w2gWatchUrl } from "@/lib/social/w2g";
import { normalizeW2gCode } from "@/lib/social/w2g-code";
import { cn } from "@/lib/core/utils";

export default function WatchTogetherPage() {
  const router = useRouter();
  const params = useSearchParams();
  const joinCode = params.get("join");
  const { auth } = useAuthStore();
  const [code, setCode] = useState(joinCode ?? "");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!joinCode || !auth) return;
    const normalized = normalizeW2gCode(joinCode);
    if (!normalized) return;
    setJoining(true);
    w2gApi
      .joinRoom(normalized)
      .then((data) => {
        toast.success(`Joined room ${data.room.code}`);
        router.replace(w2gWatchUrl(data.room));
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Could not join room");
        setJoining(false);
      });
  }, [joinCode, auth, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeW2gCode(code);
    if (!normalized) {
      toast.error("Enter a valid room code");
      return;
    }
    if (!auth) {
      toast.error("Sign in to join a watch party");
      return;
    }
    setJoining(true);
    try {
      const data = await w2gApi.joinRoom(normalized);
      toast.success(`Joined room ${data.room.code}`);
      router.push(w2gWatchUrl(data.room));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Room not found");
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen pt-page pb-24">
      <Container className="max-w-lg">
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/25 mb-4">
              <Users className="h-7 w-7 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Watch Together</h1>
            <p className="text-sm text-white/40 font-mono">
              Watch anime in sync with friends. One host controls playback for everyone.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col gap-5">
            <h2 className="text-sm font-bold text-white/85">Join a room</h2>
            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Room code (e.g. ABC123)"
                maxLength={8}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-[0.2em] text-white placeholder:text-white/25 placeholder:tracking-normal placeholder:text-sm placeholder:font-sans focus:outline-none focus:border-violet-500/40"
              />
              {auth ? (
                <button
                  type="submit"
                  disabled={joining || !code.trim()}
                  className={cn(
                    "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all",
                    "bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40",
                  )}
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Join watch party
                </button>
              ) : (
                <LoginPopoverButton
                  customTrigger={
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-white/8 text-white/70 border border-white/12 hover:bg-white/12 transition-colors"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign in to join
                    </button>
                  }
                />
              )}
            </form>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <h3 className="text-xs font-bold text-white/60 mb-3 flex items-center gap-2">
              <Tv className="h-3.5 w-3.5" />
              How it works
            </h3>
            <ol className="text-[12px] text-white/40 font-mono space-y-2 list-decimal list-inside leading-relaxed">
              <li>Open any episode and tap <strong className="text-white/60">Watch Together</strong></li>
              <li>Share the room code or invite link with friends</li>
              <li>They join here or via the link — playback stays in sync</li>
              <li>Chat in the room panel while you watch</li>
            </ol>
          </div>

          <p className="text-center text-[11px] text-white/30 font-mono">
            Browse{" "}
            <Link href={ROUTES.HOME} className="text-violet-400 hover:text-violet-300">
              anime
            </Link>{" "}
            to start a party from the player.
          </p>
        </div>
      </Container>
    </div>
  );
}
