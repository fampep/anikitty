"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Copy,
  Send,
  Crown,
  Loader2,
  LogOut,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Avatar from "@/components/common/avatar";
import { cn } from "@/lib/utils";
import { formatW2gTime, w2gInviteUrl, type W2gMember, type W2gMessage } from "@/lib/w2g";

type Props = {
  code: string;
  isHost: boolean;
  members: W2gMember[];
  messages: W2gMessage[];
  loading?: boolean;
  onSendMessage: (body: string) => Promise<void>;
  onLeave: () => Promise<void>;
};

export default function W2gPanel({
  code,
  isHost,
  members,
  messages,
  loading,
  onSendMessage,
  onLeave,
}: Props) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const copyInvite = async () => {
    const url = w2gInviteUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Room code copied!");
    } catch {
      toast.error("Could not copy code");
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSendMessage(text);
      setDraft("");
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this watch party?")) return;
    try {
      await onLeave();
      toast.success("Left room");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to leave");
    }
  };

  return (
    <div className="rounded-xl border border-violet-500/25 bg-black/80 backdrop-blur-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-violet-500/10 border-b border-violet-500/20"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Users className="h-4 w-4 text-violet-400 shrink-0" />
          <span className="text-xs font-bold text-white truncate">Watch Together</span>
          <span className="text-[10px] font-mono text-violet-300/80 bg-violet-500/15 px-1.5 py-0.5 rounded">
            {code}
          </span>
          {isHost && (
            <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5">
              <Crown className="h-3 w-3" /> Host
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-white/40 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
        )}
      </button>

      {open && (
        <div className="flex flex-col max-h-[320px]">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/8 flex-wrap">
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-white/55 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Copy className="h-3 w-3" /> Code
            </button>
            <button
              type="button"
              onClick={copyInvite}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-white/55 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <Copy className="h-3 w-3" /> Invite link
            </button>
            <button
              type="button"
              onClick={handleLeave}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-rose-300/80 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-3 w-3" /> Leave
            </button>
          </div>

          <div className="px-3 py-2 border-b border-white/8">
            <p className="text-[10px] font-mono text-white/35 mb-1.5">
              {members.length} watching · {isHost ? "You control playback" : "Synced to host"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px]",
                    m.isHost
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-white/5 text-white/60",
                  )}
                  title={m.isOnline ? "Online" : "Away"}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      m.isOnline ? "bg-emerald-400" : "bg-white/20",
                    )}
                  />
                  <Avatar url={m.avatarUrl ?? undefined} username={m.username} className="h-4 w-4" />
                  <span className="font-semibold truncate max-w-[72px]">{m.username}</span>
                </div>
              ))}
            </div>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[100px]">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-white/30" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-[11px] text-white/30 text-center py-4">Say hi to the room…</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <Avatar
                    url={msg.avatarUrl ?? undefined}
                    username={msg.username}
                    className="h-5 w-5 shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] font-semibold text-white/75">{msg.username}</span>
                      <span className="text-[9px] font-mono text-white/25">
                        {formatW2gTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-[12px] text-white/65 break-words">{msg.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={send} className="flex items-center gap-1.5 p-2 border-t border-white/8">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Room chat…"
              maxLength={500}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/40"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="p-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
