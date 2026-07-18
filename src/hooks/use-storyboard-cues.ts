"use client";

import { useEffect, useState } from "react";

import {
  parseStoryboardVtt,
  type StoryboardCue,
} from "@/lib/player/storyboard-vtt";

/**
 * Fetch + parse a storyboard WebVTT. Returns empty cues when unavailable.
 * Does not capture video frames — storyboard-only.
 */
export function useStoryboardCues(vttUrl: string | null | undefined): {
  cues: StoryboardCue[];
  ready: boolean;
} {
  const [cues, setCues] = useState<StoryboardCue[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = vttUrl?.trim() || "";
    if (!url) {
      setCues([]);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);
    setCues([]);

    void (async () => {
      try {
        const res = await fetch(url, { credentials: "omit" });
        if (!res.ok) throw new Error(`storyboard ${res.status}`);
        const text = await res.text();
        if (cancelled) return;
        // Relative sprite paths must resolve against the upstream VTT, not our proxy.
        setCues(parseStoryboardVtt(text, resolveStoryboardBaseUrl(url)));
      } catch {
        if (!cancelled) setCues([]);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vttUrl]);

  // Warm a few unique sprite sheets so scrub previews paint immediately.
  useEffect(() => {
    if (!cues.length || typeof window === "undefined") return;
    const seen = new Set<string>();
    for (const cue of cues) {
      if (!cue.src || seen.has(cue.src)) continue;
      seen.add(cue.src);
      if (seen.size > 10) break;
      const img = new window.Image();
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.src = cue.src;
    }
  }, [cues]);

  return { cues, ready };
}

/** Prefer the real VTT URL when the client fetches via `/api/kitty/subtitles/proxy`. */
function resolveStoryboardBaseUrl(fetchUrl: string): string {
  try {
    const abs =
      typeof window !== "undefined"
        ? new URL(fetchUrl, window.location.origin)
        : new URL(fetchUrl, "http://localhost");
    if (abs.pathname.includes("/api/kitty/subtitles/proxy")) {
      const upstream = abs.searchParams.get("url");
      if (upstream?.trim()) return upstream.trim();
    }
    return abs.toString();
  } catch {
    return fetchUrl;
  }
}
