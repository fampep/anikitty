"use client";

import { Fragment, type ReactNode } from "react";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function DmcaHighlight({
  text,
  highlight,
}: {
  text: string;
  highlight?: string;
}): ReactNode {
  const q = highlight?.trim();
  if (!q || q.length < 2) return <>{text}</>;
  const re = new RegExp(`(${escapeRegExp(q)})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-amber-400/25 px-0.5 text-foreground dark:bg-amber-300/20 dark:text-white"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
