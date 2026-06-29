"use client";

import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { getCategory } from "@/constants/forum";

const CATEGORY_STYLES: Record<string, string> = {
  sky: "text-sky-300 bg-sky-500/10 border-sky-500/20",
  violet: "text-violet-300 bg-violet-500/10 border-violet-500/20",
  amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  rose: "text-rose-300 bg-rose-500/10 border-rose-500/20",
};

export function CategoryBadge({ category }: { category: string }) {
  const c = getCategory(category);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border tracking-wide",
        CATEGORY_STYLES[c.color] ?? CATEGORY_STYLES.sky,
      )}
    >
      {c.label}
    </span>
  );
}

export function VoteButtons({
  score,
  myVote,
  onVote,
  size = "sm",
  orientation = "vertical",
}: {
  score: number;
  myVote: 0 | 1 | -1;
  onVote: (vote: 1 | -1) => void;
  size?: "sm" | "md";
  orientation?: "vertical" | "horizontal";
}) {
  const icon = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <div
      className={cn(
        "flex items-center shrink-0 select-none",
        orientation === "vertical" ? "flex-col gap-0.5" : "flex-row gap-1.5",
      )}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onVote(1);
        }}
        className={cn(
          "p-1 rounded-md transition-colors",
          myVote === 1 ? "text-emerald-400 bg-emerald-500/10" : "text-white/30 hover:text-white/70 hover:bg-white/5",
        )}
        aria-label="Upvote"
      >
        <ChevronUp className={icon} />
      </button>
      <span
        className={cn(
          "text-[12px] font-bold tabular-nums min-w-[1.25rem] text-center",
          myVote === 1 ? "text-emerald-400" : myVote === -1 ? "text-rose-400" : "text-white/55",
        )}
      >
        {score}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onVote(-1);
        }}
        className={cn(
          "p-1 rounded-md transition-colors",
          myVote === -1 ? "text-rose-400 bg-rose-500/10" : "text-white/30 hover:text-white/70 hover:bg-white/5",
        )}
        aria-label="Downvote"
      >
        <ChevronDown className={icon} />
      </button>
    </div>
  );
}
