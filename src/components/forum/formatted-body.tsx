"use client";

import React from "react";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"])/g;

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

function linkifyLine(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, "g");

  while ((match = re.exec(line)) !== null) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    const url = match[0];
    parts.push(
      <a
        key={`${match.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-400 hover:text-sky-300 underline underline-offset-2 break-all"
      >
        {url}
      </a>,
    );
    last = match.index + url.length;
  }

  if (last < line.length) parts.push(line.slice(last));
  if (parts.length === 0) return [line];
  return parts;
}
