import { isAllowedMediaProxyUrl } from "@/lib/security";
import { NextResponse } from "next/server";

// ── HLS attribute parser ──────────────────────────────────────────────
function parseHlsAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Z0-9-]+)=("(?:[^"\\]|\\.)*"|[^,\s]+)/g;
  let m;
  while ((m = re.exec(s)) !== null) out[m[1]] = m[2].replace(/^"|"$/g, "");
  return out;
}

// ── VTT time formatter ────────────────────────────────────────────────
function toVttTime(sec: number): string {
  const h  = Math.floor(sec / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  const s  = sec % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = s.toFixed(3).padStart(6, "0");
  return `${hh}:${mm}:${ss}`;
}

interface Chapter { start: number; end: number; title: string }

// ── Parse media playlist for chapter markers ──────────────────────────
function extractChapters(text: string, totalDuration?: number): Chapter[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const chapters: Chapter[] = [];

  let programDateTimeMs: number | null = null;
  let accSec = 0; // accumulated segment time

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Reference wall-clock start for DATERANGE
    if (line.startsWith("#EXT-X-PROGRAM-DATE-TIME:")) {
      programDateTimeMs = new Date(line.slice(25).trim()).getTime();
      continue;
    }

    // Explicit DATERANGE chapter marker
    if (line.startsWith("#EXT-X-DATERANGE:")) {
      if (programDateTimeMs === null) continue;
      const attrs = parseHlsAttrs(line.slice(17));
      const startDate = attrs["START-DATE"];
      const dur       = parseFloat(attrs.DURATION ?? "0");
      const title     = attrs["X-TITLE"] ?? attrs["TITLE"] ?? attrs.ID ?? "";

      if (!startDate || isNaN(dur) || dur <= 0 || !title) continue;

      const offsetSec = (new Date(startDate).getTime() - programDateTimeMs) / 1000;
      if (offsetSec < 0) continue;

      chapters.push({ start: offsetSec, end: offsetSec + dur, title });
      continue;
    }

    // Named #EXTINF segment: #EXTINF:4.004,Chapter Title
    if (line.startsWith("#EXTINF:")) {
      const commaIdx = line.indexOf(",");
      const segDur   = parseFloat(line.slice(8, commaIdx > 8 ? commaIdx : undefined));
      const title    = commaIdx > 0 ? line.slice(commaIdx + 1).trim() : "";

      if (title) {
        // Merge consecutive segments with the same title
        const prev = chapters[chapters.length - 1];
        if (prev && prev.title === title && Math.abs(prev.end - accSec) < 0.1) {
          prev.end = accSec + segDur;
        } else {
          chapters.push({ start: accSec, end: accSec + segDur, title });
        }
      }

      accSec += isNaN(segDur) ? 0 : segDur;
    }
  }

  // Close the last chapter to totalDuration if known
  if (totalDuration && chapters.length > 0) {
    chapters[chapters.length - 1].end = Math.max(
      chapters[chapters.length - 1].end,
      totalDuration,
    );
  }

  return chapters;
}

// ── Fetch + follow master → variant ──────────────────────────────────
async function fetchPlaylistText(
  url: string,
  fetchHeaders: HeadersInit,
): Promise<{ text: string; finalUrl: string }> {
  const res = await fetch(url, { headers: fetchHeaders, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  const text = await res.text();

  if (!text.includes("#EXT-X-STREAM-INF:")) return { text, finalUrl: url };

  // Master playlist — follow first variant
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("#EXT-X-STREAM-INF:")) {
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (next && !next.startsWith("#")) {
          const variantUrl = next.startsWith("http") ? next : new URL(next, url).href;
          return fetchPlaylistText(variantUrl, fetchHeaders);
        }
      }
    }
  }

  return { text, finalUrl: url };
}

// ── Route handler ─────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const src     = searchParams.get("url");
  const referer = searchParams.get("referer") ?? "";

  if (!src) return NextResponse.json({ error: "Missing url" }, { status: 400 });
  if (!isAllowedMediaProxyUrl(src)) {
    return NextResponse.json({ error: "url not allowed" }, { status: 403 });
  }

  const fetchHeaders: HeadersInit = {
    "User-Agent": "Mozilla/5.0",
    ...(referer && {
      Referer: referer,
      Origin: (() => { try { return new URL(referer).origin; } catch { return referer; } })(),
    }),
  };

  try {
    const { text } = await fetchPlaylistText(src, fetchHeaders);
    const chapters = extractChapters(text);

    if (chapters.length === 0) {
      return new Response("", { status: 204 });
    }

    // Build WebVTT
    const cues = chapters
      .map((c, i) => {
        const start = toVttTime(c.start);
        const end   = toVttTime(c.end);
        return `${i + 1}\n${start} --> ${end}\n${c.title}`;
      })
      .join("\n\n");

    return new Response(`WEBVTT\n\n${cues}\n`, {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("", { status: 204 });
  }
}
