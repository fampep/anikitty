"use client";

import { Fragment, useState, type ReactNode } from "react";
import { cn } from "@/lib/core/utils";
import { isSafeHttpsUrl } from "@/lib/security/security";
import {
  parseBbcode,
  sanitizeBbColor,
  sanitizeBbSize,
  type BbNode,
} from "@/lib/text/bbcode";
import { useT } from "@/providers/i18n-provider";

function InlineSpoiler({ children }: { children: ReactNode }) {
  const t = useT();
  const [revealed, setRevealed] = useState(false);
  if (revealed) {
    return <span className="rounded bg-white/[0.06] px-0.5">{children}</span>;
  }
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className="rounded bg-white/10 px-1 text-transparent [text-shadow:0_0_8px_rgba(255,255,255,0.55)] select-none hover:bg-white/[0.14]"
      title={t("comments.revealSpoiler")}
      aria-label={t("comments.spoilerReveal")}
    >
      {children}
    </button>
  );
}

function renderNodes(nodes: BbNode[], keyBase: string, imgCount: { n: number }): ReactNode[] {
  return nodes.map((node, index) => renderNode(node, `${keyBase}-${index}`, imgCount));
}

function firstText(nodes: BbNode[]): string {
  for (const node of nodes) {
    if (node.type === "text") return node.value.trim();
    const nested = firstText(node.children);
    if (nested) return nested;
  }
  return "";
}

function renderNode(node: BbNode, key: string, imgCount: { n: number }): ReactNode {
  if (node.type === "text") {
    const lines = node.value.split("\n");
    if (lines.length === 1) return node.value;
    return lines.map((line, i) => (
      <Fragment key={`${key}-ln-${i}`}>
        {i > 0 && <br />}
        {line}
      </Fragment>
    ));
  }

  const children = renderNodes(node.children, key, imgCount);

  switch (node.name) {
    case "b":
      return (
        <strong key={key} className="font-semibold text-foreground/90 dark:text-white/90">
          {children}
        </strong>
      );
    case "i":
      return <em key={key}>{children}</em>;
    case "u":
      return <span key={key} className="underline underline-offset-2">{children}</span>;
    case "s":
      return <span key={key} className="line-through opacity-80">{children}</span>;
    case "color": {
      const color = sanitizeBbColor(node.attr);
      if (!color) return <Fragment key={key}>{children}</Fragment>;
      return (
        <span key={key} style={{ color }}>
          {children}
        </span>
      );
    }
    case "size": {
      const size = sanitizeBbSize(node.attr);
      if (!size) return <Fragment key={key}>{children}</Fragment>;
      return (
        <span key={key} style={{ fontSize: `${size}px` }}>
          {children}
        </span>
      );
    }
    case "url": {
      const href = node.attr?.trim() || firstText(node.children);
      if (!isSafeHttpsUrl(href)) return <Fragment key={key}>{children}</Fragment>;
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-violet-300 hover:text-violet-200 underline decoration-violet-400/30 underline-offset-2"
        >
          {children.length ? children : href}
        </a>
      );
    }
    case "img": {
      if (imgCount.n >= 2) return null;
      const src = firstText(node.children);
      if (!isSafeHttpsUrl(src)) return null;
      imgCount.n += 1;
      return (
        <span key={key} className="my-2 block max-w-full overflow-hidden rounded-lg border border-border/60 dark:border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            loading="lazy"
            className="max-h-48 w-auto max-w-full object-contain bg-black/20"
            referrerPolicy="no-referrer"
          />
        </span>
      );
    }
    case "quote":
      return (
        <blockquote
          key={key}
          className="my-2 border-l-2 border-violet-400/40 pl-3 text-foreground/75 dark:text-white/65 italic"
        >
          {children}
        </blockquote>
      );
    case "code":
      return (
        <code
          key={key}
          className="my-1 block overflow-x-auto rounded-lg border border-border/60 bg-muted/50 px-3 py-2 font-mono text-[12px] text-foreground/85 dark:border-white/10 dark:bg-black/30 dark:text-white/80"
        >
          {node.children.map((c) => (c.type === "text" ? c.value : "")).join("")}
        </code>
      );
    case "center":
      return (
        <div key={key} className="my-1 text-center">
          {children}
        </div>
      );
    case "left":
      return (
        <div key={key} className="my-1 text-left">
          {children}
        </div>
      );
    case "right":
      return (
        <div key={key} className="my-1 text-right">
          {children}
        </div>
      );
    case "list":
      return (
        <ul key={key} className="my-2 list-disc space-y-1 pl-5">
          {children}
        </ul>
      );
    case "li":
      return <li key={key}>{children}</li>;
    case "spoiler":
      return <InlineSpoiler key={key}>{children}</InlineSpoiler>;
    case "hr":
      return <hr key={key} className="my-3 border-border/60 dark:border-white/10" />;
    default:
      return <Fragment key={key}>{children}</Fragment>;
  }
}

type Props = {
  bio: string;
  className?: string;
};

/** Renders a profile bio with safe BBCode formatting. */
export default function ProfileBioContent({ bio, className }: Props) {
  const trimmed = bio.trim();
  if (!trimmed) return null;

  const hasTags = /\[[a-z*/]/i.test(trimmed);
  if (!hasTags) {
    return (
      <div className={cn("text-sm text-foreground/80 dark:text-white/70 leading-relaxed whitespace-pre-wrap", className)}>
        {trimmed}
      </div>
    );
  }

  const nodes = parseBbcode(trimmed);
  const imgCount = { n: 0 };
  const content = renderNodes(nodes, "bio", imgCount);

  return (
    <div
      className={cn(
        "text-sm text-foreground/80 dark:text-white/70 leading-relaxed break-words [&_a]:break-all",
        className,
      )}
    >
      {content}
    </div>
  );
}
