"use client";

import React from "react";
import Link from "next/link";
import { linkifyLine } from "@/lib/text/linkify";
import { cn } from "@/lib/core/utils";

const MENTION_RE = /@([A-Za-z0-9_]{2,32})/g;

function renderLineWithMentionsAndLinks(
  line: string,
  linkClassName?: string,
  mentionClassName?: string,
) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, "g");

  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      parts.push(...linkifyLine(line.slice(last, match.index), linkClassName));
    }
    const username = match[1];
    parts.push(
      <Link
        key={`m-${match.index}-${username}`}
        href={`/profile/${encodeURIComponent(username)}`}
        className={cn(
          "font-medium text-zinc-300 hover:text-zinc-200",
          mentionClassName,
        )}
      >
        @{username}
      </Link>,
    );
    last = match.index + match[0].length;
  }

  if (last < line.length) {
    parts.push(...linkifyLine(line.slice(last), linkClassName));
  }

  if (parts.length === 0) return linkifyLine(line, linkClassName);
  return parts;
}

/** Chat message body with auto-linked URLs and @mentions. */
export function ChatMessageText({
  text,
  className,
  linkClassName,
  mentionClassName,
  onDoubleClick,
  title,
}: {
  text: string;
  className?: string;
  linkClassName?: string;
  mentionClassName?: string;
  onDoubleClick?: () => void;
  title?: string;
}) {
  const lines = text.split("\n");

  return (
    <p
      className={cn("whitespace-pre-wrap", className)}
      onDoubleClick={onDoubleClick}
      title={title}
    >
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {renderLineWithMentionsAndLinks(line, linkClassName, mentionClassName)}
          {i < lines.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
    </p>
  );
}
