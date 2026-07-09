"use client";

import React from "react";
import { linkifyLine } from "@/lib/text/linkify";
import { cn } from "@/lib/core/utils";

/** Chat message body with auto-linked URLs. */
export function ChatMessageText({
  text,
  className,
  linkClassName,
  onDoubleClick,
  title,
}: {
  text: string;
  className?: string;
  linkClassName?: string;
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
          {linkifyLine(line, linkClassName)}
          {i < lines.length - 1 ? "\n" : null}
        </React.Fragment>
      ))}
    </p>
  );
}
