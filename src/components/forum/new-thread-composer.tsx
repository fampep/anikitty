"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { FORUM_CATEGORIES } from "@/constants/forum";
import { forumApi, ForumThread } from "@/lib/social/forum";

export default function NewThreadComposer({
  defaultCategory,
  onCreated,
  onCancel,
}: {
  defaultCategory?: string;
  onCreated: (thread: ForumThread) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(
    defaultCategory && defaultCategory !== "all" ? defaultCategory : "general",
  );
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length >= 3 && body.trim().length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const thread = await forumApi.createThread({
        title: title.trim(),
        body: body.trim(),
        category,
      });
      toast.success("Thread posted");
      onCreated(thread);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post thread");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/85">Start a new thread</h3>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category picker */}
      <div className="flex flex-wrap gap-1.5">
        {FORUM_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors",
              category === c.id
                ? "bg-white/10 text-white border-white/15"
                : "bg-white/[0.02] text-white/45 border-white/8 hover:text-white/75 hover:bg-white/5",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="Thread title"
        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="Share your thoughts, ask a question, or recommend a series…"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors resize-none leading-relaxed"
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[11px] font-mono text-white/25">
          {body.length}/1000 · Ctrl+Enter to post · Links are auto-linked
        </span>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-white/90 active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Post Thread
        </button>
      </div>
    </div>
  );
}
