import React from "react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";

// Bold (**x** / __x__) or a markdown link [label](url).
const TOKEN_RE = /(\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]*\))/g;

/**
 * Renders AniList's markdown-ish bio/description text: bold labels, AniList
 * anime links rewritten to internal pages, other links reduced to their label,
 * with spoiler markers and stray HTML removed.
 */
export default function AniListRichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const normalized = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/~!|!~/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;

  while ((m = TOKEN_RE.exec(normalized)) !== null) {
    if (m.index > last) parts.push(normalized.slice(last, m.index));
    const tok = m[0];

    if (tok.startsWith("**") || tok.startsWith("__")) {
      parts.push(<strong key={key} className="font-semibold text-foreground/90 dark:text-white/80">{tok.slice(2, -2)}</strong>);
    } else {
      const link = /\[([^\]]+)\]\(([^)]*)\)/.exec(tok);
      const label = link?.[1] ?? tok;
      const url = link?.[2] ?? "";
      const anime = url.match(/anilist\.co\/anime\/(\d+)/i);
      if (anime) {
        parts.push(
          <Link key={key} href={`${ROUTES.ANIME_DETAILS}/${anime[1]}`} className="text-violet-300 hover:text-violet-200 underline decoration-violet-400/30 underline-offset-2">
            {label}
          </Link>,
        );
      } else {
        parts.push(<React.Fragment key={key}>{label}</React.Fragment>);
      }
    }

    last = m.index + tok.length;
    key++;
  }
  if (last < normalized.length) parts.push(normalized.slice(last));

  return <p className={className} style={{ whiteSpace: "pre-wrap" }}>{parts}</p>;
}
