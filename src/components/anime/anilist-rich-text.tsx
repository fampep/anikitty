"use client";

import React, { Fragment, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

// AniList spoiler ~!...!~, then bold (**x** / __x__) or a markdown link.
const SPOILER_RE = /~!([\s\S]+?)!~/g;
const INLINE_RE = /(\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]*\))/g;

function normalize(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Renders bold + links inside a plain run.
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;

  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**") || tok.startsWith("__")) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-foreground/90 dark:text-white/85">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      const link = /\[([^\]]+)\]\(([^)]*)\)/.exec(tok);
      const label = link?.[1] ?? tok;
      const url = link?.[2] ?? "";
      const anime = url.match(/anilist\.co\/anime\/(\d+)/i);
      nodes.push(
        anime ? (
          <Link key={`${keyBase}-l${i}`} href={`${ROUTES.ANIME_DETAILS}/${anime[1]}`} className="text-violet-300 hover:text-violet-200 underline decoration-violet-400/30 underline-offset-2">
            {label}
          </Link>
        ) : (
          <Fragment key={`${keyBase}-t${i}`}>{label}</Fragment>
        ),
      );
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function InlineSpoiler({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) return <span className="rounded bg-white/[0.06] px-0.5">{children}</span>;
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className="rounded bg-white/10 px-1 text-transparent [text-shadow:0_0_8px_rgba(255,255,255,0.55)] select-none hover:bg-white/[0.14]"
      title="Reveal spoiler"
    >
      {children}
    </button>
  );
}

/**
 * Renders AniList markdown-ish text: bold, AniList anime links rewritten to
 * internal pages (other links reduced to labels), and ~!spoilers!~ blurred
 * behind a click-to-reveal.
 */
export default function AniListRichText({ text, className }: { text: string; className?: string }) {
  const normalized = normalize(text);
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  SPOILER_RE.lastIndex = 0;

  while ((m = SPOILER_RE.exec(normalized)) !== null) {
    if (m.index > last) out.push(<Fragment key={`pre${i}`}>{renderInline(normalized.slice(last, m.index), `p${i}`)}</Fragment>);
    out.push(<InlineSpoiler key={`sp${i}`}>{renderInline(m[1], `s${i}`)}</InlineSpoiler>);
    last = m.index + m[0].length;
    i++;
  }
  if (last < normalized.length) out.push(<Fragment key="tail">{renderInline(normalized.slice(last), "tail")}</Fragment>);

  return <p className={className} style={{ whiteSpace: "pre-wrap" }}>{out}</p>;
}

/** Plain-text version for previews: strips markdown and drops spoiler content. */
export function cleanAniListText(raw: string): string {
  return normalize(raw)
    .replace(/~!([\s\S]+?)!~/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
