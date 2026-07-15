"use client";

import { Fragment, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePlayerSeekStore } from "@/store/player-seek-store";
import { useT } from "@/providers/i18n-provider";

// mm:ss / h:mm:ss timestamp, or @username mention.
const INLINE_RE = /(\d{1,2}:[0-5]\d(?::[0-5]\d)?)|@([A-Za-z0-9_]{2,32})/g;
const SPOILER_RE = /\|\|([\s\S]+?)\|\|/g;

function timestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return -1;
  return parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts[0] * 60 + parts[1];
}

function TimestampChip({ label, seconds }: { label: string; seconds: number }) {
  const seek = usePlayerSeekStore((s) => s.seek);
  if (!seek) return <>{label}</>;
  return (
    <button
      type="button"
      onClick={() => {
        seek(seconds);
        document
          .querySelector(".kitty-vidstack-player")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
      className="inline text-violet-300 hover:text-violet-200 font-mono font-medium underline decoration-violet-400/40 underline-offset-2"
    >
      {label}
    </button>
  );
}

function InlineSpoiler({ children }: { children: ReactNode }) {
  const t = useT();
  const [revealed, setRevealed] = useState(false);
  if (revealed) return <span className="rounded bg-white/[0.06] px-0.5">{children}</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(true);
      }}
      className="rounded bg-white/10 px-1 text-transparent [text-shadow:0_0_8px_rgba(255,255,255,0.6)] select-none hover:bg-white/[0.14]"
      title={t("comments.revealSpoiler")}
    >
      {children}
    </button>
  );
}

/** Render timestamps + @mentions inside a plain-text run. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  let i = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      const seconds = timestampToSeconds(m[1]);
      nodes.push(
        seconds >= 0 ? (
          <TimestampChip key={`${keyBase}-t${i}`} label={m[1]} seconds={seconds} />
        ) : (
          m[1]
        ),
      );
    } else if (m[2]) {
      nodes.push(
        <Link
          key={`${keyBase}-m${i}`}
          href={`/profile/${m[2]}`}
          className="text-violet-300 hover:text-violet-200 font-medium"
        >
          @{m[2]}
        </Link>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Renders comment text with clickable timestamps, @mentions, and ||spoilers||. */
export default function CommentBody({ body }: { body: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  SPOILER_RE.lastIndex = 0;
  let i = 0;
  while ((m = SPOILER_RE.exec(body)) !== null) {
    if (m.index > last) out.push(<Fragment key={`s-pre${i}`}>{renderInline(body.slice(last, m.index), `p${i}`)}</Fragment>);
    out.push(
      <InlineSpoiler key={`s${i}`}>{renderInline(m[1], `s${i}`)}</InlineSpoiler>,
    );
    last = m.index + m[0].length;
    i++;
  }
  if (last < body.length) out.push(<Fragment key="s-tail">{renderInline(body.slice(last), "tail")}</Fragment>);
  return <>{out}</>;
}
