"use client";

import React from "react";
import { linkifyLine } from "@/lib/text/linkify";

/** Renders forum text with clickable links and blockquote styling for `> ` lines. */
export function FormattedBody({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        if (line.startsWith("> ")) {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-border dark:border-white/20 pl-3 text-muted-foreground dark:text-white/55 text-[13px] italic"
            >
              {linkifyLine(line.slice(2))}
            </blockquote>
          );
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {linkifyLine(line)}
            {i < lines.length - 1 ? "\n" : null}
          </span>
        );
      })}
    </div>
  );
}
