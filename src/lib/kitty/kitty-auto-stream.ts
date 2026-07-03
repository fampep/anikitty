import { buildKittyAutoStreamUrl, kittyApiHeaders } from "@/lib/kitty/kitty-api";
import {
  isKittyProvider,
  KITTY_PROVIDERS,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";

export type KittyAutoStreamEntry = {
  file: string;
  headers: Record<string, string>;
  tracks?: StreamTrack[];
  provider?: string;
  server?: string | null;
  download?: string | null;
};

const AUTO_STREAM_TIMEOUT_MS = 28_000;

function normalizeProviderName(name: string | undefined): string {
  return (name ?? "").trim().toLowerCase();
}

export function parseKittyProviderFromApi(name: string | undefined): KittyProvider | null {
  if (!name) return null;
  if (isKittyProvider(name)) return name;
  return KITTY_PROVIDERS.find((p) => p.toLowerCase() === name.toLowerCase()) ?? null;
}

function normalizeAutoStreamEntry(raw: unknown): KittyAutoStreamEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const file = row.file;
  if (typeof file !== "string" || !file.trim()) return null;

  const server =
    typeof row.server === "string"
      ? row.server
      : typeof row.serverName === "string"
        ? row.serverName
        : null;

  return {
    file,
    headers: (row.headers ?? {}) as Record<string, string>,
    tracks: Array.isArray(row.tracks) ? (row.tracks as StreamTrack[]) : undefined,
    provider: typeof row.provider === "string" ? row.provider : undefined,
    server,
    download: typeof row.download === "string" ? row.download : null,
  };
}

function collectAutoStreamEntries(body: Record<string, unknown>): KittyAutoStreamEntry[] {
  const items: KittyAutoStreamEntry[] = [];
  const seen = new Set<string>();

  const push = (raw: unknown) => {
    const entry = normalizeAutoStreamEntry(raw);
    if (!entry) return;
    const key = `${normalizeProviderName(entry.provider)}|${entry.file}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(entry);
  };

  push(body.firstWorking);
  if (Array.isArray(body.allWorkingStreams)) {
    for (const stream of body.allWorkingStreams) {
      push(stream);
    }
  }

  return items;
}

function pickAutoStreamEntry(
  streams: KittyAutoStreamEntry[],
  preferredProvider?: KittyProvider,
): KittyAutoStreamEntry | null {
  if (streams.length === 0) return null;

  if (preferredProvider) {
    const preferred = normalizeProviderName(preferredProvider);
    const match = streams.find((s) => normalizeProviderName(s.provider) === preferred);
    if (match) return match;
  }

  return streams[0] ?? null;
}

export async function fetchKittyAutoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  provider?: KittyProvider;
  title?: string | null;
}): Promise<{ entry: KittyAutoStreamEntry; resolvedProvider: KittyProvider | null } | null> {
  const url = buildKittyAutoStreamUrl({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(AUTO_STREAM_TIMEOUT_MS),
      headers: kittyApiHeaders(),
    });

    const body = (await res.json()) as Record<string, unknown>;
    if (!res.ok) return null;

    const streams = collectAutoStreamEntries(body);
    const entry = pickAutoStreamEntry(streams, opts.provider);
    if (!entry) return null;

    return {
      entry,
      resolvedProvider: parseKittyProviderFromApi(entry.provider) ?? opts.provider ?? null,
    };
  } catch {
    return null;
  }
}
