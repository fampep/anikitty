"use client";

import React from "react";
import Link from "next/link";
import { linkifyLine } from "@/lib/text/linkify";
import { cn } from "@/lib/core/utils";

const MENTION_RE = /@([A-Za-z0-9_]{2,32})/g;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, highlight?: string): React.ReactNode[] {
  if (!highlight?.trim()) return [text];
  const re = new RegExp(`(${escapeRegExp(highlight.trim())})`, "ig");
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-amber-400/35 text-inherit rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function renderLineWithMentionsAndLinks(
  line: string,
  linkClassName?: string,
  mentionClassName?: string,
  highlight?: string,
) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, "g");

  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      const chunk = line.slice(last, match.index);
      if (highlight) {
        parts.push(...highlightText(chunk, highlight).flatMap((n, i) =>
          typeof n === "string" ? linkifyLine(n, linkClassName).map((x, j) => (
            <React.Fragment key={`h-${match!.index}-${i}-${j}`}>{x}</React.Fragment>
          )) : <React.Fragment key={`hm-${match!.index}-${i}`}>{n}</React.Fragment>,
        ));
      } else {
        parts.push(...linkifyLine(chunk, linkClassName));
      }
    }
    const username = match[1];
    parts.push(
      <Link
        key={`m-${match.index}-${username}`}
        href={`/profile/${encodeURIComponent(username)}`}
        className={cn(
          "font-medium text-sky-300 hover:text-sky-200",
          mentionClassName,
        )}
      >
        @{username}
      </Link>,
    );
    last = match.index + match[0].length;
  }

  if (last < line.length) {
    const chunk = line.slice(last);
    if (highlight) {
      for (const n of highlightText(chunk, highlight)) {
        if (typeof n === "string") parts.push(...linkifyLine(n, linkClassName));
        else parts.push(n);
      }
    } else {
      parts.push(...linkifyLine(chunk, linkClassName));
    }
  }

  if (parts.length === 0) {
    if (highlight) return highlightText(line, highlight);
    return linkifyLine(line, linkClassName);
  }
  return parts;
}

/** Chat message body with auto-linked URLs, @mentions, and optional search highlight. */
export function ChatMessageText({
  text,
  className,
  linkClassName,
  mentionClassName,
  highlight,
  onDoubleClick,
  title,
}: {
  text: string;
  className?: string;
  linkClassName?: string;
  mentionClassName?: string;
  highlight?: string;
  onDoubleClick?: () => void;
  title?: string;
}) {
  const lines = text.split("\n");

  return (
    <p
      className={cn("whitespace-pre-wrap text-sm leading-relaxed break-words text-foreground dark:text-white/90", className)}
      onDoubleClick={onDoubleClick}
      title={title}
    >
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {renderLineWithMentionsAndLinks(line, linkClassName, mentionClassName, highlight)}
          {i < lines.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
    </p>
  );
}
