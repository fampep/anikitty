"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/core/utils";

type Props = {
  content: string;
  className?: string;
  /** Optional query to highlight in plain text runs. */
  highlight?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, highlight }: { text: string; highlight?: string }) {
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

function renderInline(text: string, highlight?: string, keyBase = "i"): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  re.lastIndex = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(
        <HighlightText key={`${keyBase}-t${i}`} text={text.slice(last, m.index)} highlight={highlight} />,
      );
    }
    const tok = m[0];
    if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded bg-muted/70 px-1 py-0.5 font-mono text-[0.85em] text-foreground/90 dark:bg-white/[0.08] dark:text-white/85"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("**") || tok.startsWith("__")) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-foreground/90 dark:text-white/85">
          <HighlightText text={tok.slice(2, -2)} highlight={highlight} />
        </strong>,
      );
    } else if (tok.startsWith("*") || tok.startsWith("_")) {
      nodes.push(
        <em key={`${keyBase}-e${i}`}>
          <HighlightText text={tok.slice(1, -1)} highlight={highlight} />
        </em>,
      );
    } else if (tok.startsWith("![")) {
      const img = /!\[([^\]]*)\]\(([^)]+)\)/.exec(tok);
      if (img) {
        nodes.push(
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary FAQ image URLs
          <img
            key={`${keyBase}-img${i}`}
            src={img[2]}
            alt={img[1]}
            loading="lazy"
            decoding="async"
            className="my-3 max-h-64 w-auto max-w-full rounded-lg border border-border/60 dark:border-white/10"
          />,
        );
      }
    } else {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      const label = link?.[1] ?? tok;
      const href = link?.[2] ?? "#";
      const external = /^https?:\/\//i.test(href);
      if (external) {
        nodes.push(
          <a
            key={`${keyBase}-a${i}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground/50 dark:text-white/85 dark:decoration-white/25 dark:hover:decoration-white/50"
          >
            <HighlightText text={label} highlight={highlight} />
          </a>,
        );
      } else {
        nodes.push(
          <Link
            key={`${keyBase}-l${i}`}
            href={href}
            className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground/50 dark:text-white/85 dark:decoration-white/25 dark:hover:decoration-white/50"
          >
            <HighlightText text={label} highlight={highlight} />
          </Link>,
        );
      }
    }
    last = m.index + tok.length;
    i++;
  }
  if (last < text.length) {
    nodes.push(<HighlightText key={`${keyBase}-tail`} text={text.slice(last)} highlight={highlight} />);
  }
  return nodes;
}

function isTableSeparator(line: string) {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line.trim());
}

function parseTable(rows: string[]): ReactNode {
  const cells = rows.map((row) =>
    row
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim()),
  );
  if (cells.length < 2) return null;
  const header = cells[0];
  const bodyRows = isTableSeparator(rows[1]) ? cells.slice(2) : cells.slice(1);

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border/70 dark:border-white/10">
      <table className="w-full min-w-[16rem] border-collapse text-left text-sm">
        <thead className="bg-muted/40 dark:bg-white/[0.04]">
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="px-3 py-2 font-semibold text-foreground/90 dark:text-white/80">
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri} className="border-t border-border/60 dark:border-white/[0.06]">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-muted-foreground dark:text-white/55">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseBlocks(content: string, highlight?: string): ReactNode[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let block = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        <pre
          key={`code-${block++}`}
          className="my-3 overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-3 font-mono text-[12px] leading-relaxed text-foreground/85 dark:border-white/10 dark:bg-black/40 dark:text-white/75"
          data-lang={lang || undefined}
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (line.trim().startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i]);
        i++;
      }
      out.push(<Fragment key={`table-${block++}`}>{parseTable(rows)}</Fragment>);
      continue;
    }

    if (/^[-*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim())) {
      const ordered = /^\d+\.\s+/.test(line.trim());
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (ordered ? /^\d+\.\s+/.test(t) : /^[-*]\s+/.test(t)) {
          items.push(t.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ""));
          i++;
        } else if (!t) {
          break;
        } else {
          break;
        }
      }
      const ListTag = ordered ? "ol" : "ul";
      out.push(
        <ListTag
          key={`list-${block++}`}
          className={cn(
            "my-2 space-y-1.5 pl-5 text-muted-foreground dark:text-white/55",
            ordered ? "list-decimal" : "list-disc",
          )}
        >
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item, highlight, `li${block}-${idx}`)}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    if (/^#{1,3}\s+/.test(line.trim())) {
      const level = line.trim().match(/^#+/)?.[0].length ?? 2;
      const text = line.trim().replace(/^#{1,3}\s+/, "");
      const Tag = (level === 1 ? "h3" : level === 2 ? "h4" : "h5") as "h3" | "h4" | "h5";
      out.push(
        <Tag
          key={`h-${block++}`}
          className="mb-1 mt-3 text-sm font-semibold text-foreground dark:text-white/85"
        >
          {renderInline(text, highlight, `h${block}`)}
        </Tag>,
      );
      i++;
      continue;
    }

    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^[-*]\s+/.test(lines[i].trim()) && !/^\d+\.\s+/.test(lines[i].trim()) && !lines[i].trim().startsWith("|") && !lines[i].trim().startsWith("```") && !/^#{1,3}\s+/.test(lines[i].trim())) {
      para.push(lines[i]);
      i++;
    }
    out.push(
      <p key={`p-${block++}`} className="my-2 leading-relaxed text-muted-foreground dark:text-white/55">
        {renderInline(para.join(" "), highlight, `p${block}`)}
      </p>,
    );
  }

  return out;
}

export default function FaqMarkdown({ content, className, highlight }: Props) {
  return <div className={cn("faq-md text-sm", className)}>{parseBlocks(content, highlight)}</div>;
}
