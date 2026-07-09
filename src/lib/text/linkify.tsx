import React from "react";

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"])/g;

/** Split a single line into text nodes and external link anchors. */
export function linkifyLine(
  line: string,
  linkClassName = "text-sky-400 hover:text-sky-300 underline underline-offset-2 break-all",
): React.ReactNode[] {
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
        className={linkClassName}
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
