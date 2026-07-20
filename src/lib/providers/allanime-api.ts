import { kittyApiFetch } from "@/lib/kitty/kitty-api-server";
import { kittyStreamHeaders, parseKittyStreamJson } from "@/lib/kitty/kitty-api-core";
import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { StreamCapabilities } from "@/lib/kitty/stream-capabilities-shared";
import {
  ALLANIME_MIRROR_OPTIONS,
  DEFAULT_ALLANIME_MIRROR,
  DEFAULT_MKISSA_MIRROR,
  MKISSA_MIRROR_OPTIONS,
  SAFE_ALLANIME_MIRROR,
  defaultAllanimeMirrorForProvider,
  type AllanimeKittyServer,
  type AllanimeMirrorId,
  type AllanimeProviderName,
  type AllanimeStreamResult,
} from "@/lib/providers/allanime-config";

export * from "@/lib/providers/allanime-config";

const ALLANIME_PREFERRED = ALLANIME_MIRROR_OPTIONS;
const MKISSA_PREFERRED = MKISSA_MIRROR_OPTIONS;

type AllanimeLinkId = {
  showId?: string;
  ep?: string;
  mode?: string;
  provider?: string;
};

function allanimeDataIds(anilistId: number, episode: number, mode: "sub" | "dub"): string {
  return JSON.stringify({
    anilistId,
    ep: String(episode),
    mode,
  });
}

/** Single-call stream linkId — API resolves showId from anilistId + extracts the named mirror. */
function buildAllanimeMirrorLinkId(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  mirror: AllanimeMirrorId;
}): string {
  return JSON.stringify({
    anilistId: opts.anilistId,
    ep: String(opts.episode),
    mode: opts.audio,
    provider: opts.mirror,
  });
}

/** Parse mirror label from Kitty server row name (e.g. "Ok (SUB)", "MKissa - Ok (SUB)"). */
export function mirrorFromAllanimeRow(row: Pick<AllanimeKittyServer, "name" | "id">): AllanimeMirrorId {
  try {
    const link = JSON.parse(row.id) as AllanimeLinkId;
    if (link.provider?.trim()) return link.provider.trim();
  } catch {
    // fall through to name parsing
  }

  const trimmed = row.name.trim();
  const mkissa = trimmed.match(/^MKissa\s*-\s*(.+?)\s*\(/i);
  if (mkissa?.[1]) return mkissa[1].trim();

  const plain = trimmed.match(/^(.+?)\s*\(/);
  if (plain?.[1]) return plain[1].trim();

  return trimmed || "Unknown";
}

function mirrorMatchesRow(mirror: AllanimeMirrorId, row: AllanimeKittyServer): boolean {
  return mirrorFromAllanimeRow(row) === mirror;
}

export function pickDefaultAllanimeMirror(
  rows: AllanimeKittyServer[],
  provider: AllanimeProviderName,
): AllanimeMirrorId | null {
  if (!rows.length) return null;

  const preferred = provider === "MKissa" ? MKISSA_PREFERRED : ALLANIME_PREFERRED;
  const mirrors = rows.map((row) => mirrorFromAllanimeRow(row));

  for (const name of preferred) {
    if (mirrors.includes(name)) return name;
  }

  return mirrors[0] ?? null;
}

function enrichServerRows(rows: AllanimeKittyServer[]): AllanimeKittyServer[] {
  return rows.map((row) => ({
    ...row,
    mirror: mirrorFromAllanimeRow(row),
  }));
}

function uniqueMirrorRows(rows: AllanimeKittyServer[]): AllanimeKittyServer[] {
  const seen = new Set<string>();
  const out: AllanimeKittyServer[] = [];

  for (const row of enrichServerRows(rows)) {
    if (seen.has(row.mirror)) continue;
    seen.add(row.mirror);
    out.push(row);
  }

  return out;
}

export async function fetchAllanimeServers(opts: {
  provider: AllanimeProviderName;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AllanimeKittyServer[]> {
  const params = new URLSearchParams({
    dataIds: allanimeDataIds(opts.anilistId, opts.episode, opts.audio),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await kittyApiFetch(
    `/provider/${opts.provider}/servers?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: kittyStreamHeaders(),
    },
  );

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => ({
      id: String(row?.id ?? ""),
      name: String(row?.name ?? "").trim(),
      mirror: "",
    }))
    .filter((row) => row.id && row.name);
}

async function fetchAllanimeStreamByLinkId(
  provider: AllanimeProviderName,
  linkId: string,
): Promise<AllanimeStreamResult | null> {
  const params = new URLSearchParams({ linkId });
  const res = await kittyApiFetch(
    `/provider/${provider}/stream?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: kittyStreamHeaders(),
    },
  );

  if (!res.ok) return null;

  const parsed = parseKittyStreamJson(await res.json(), res.ok);
  if (!parsed?.file) return null;

  const tracks: StreamTrack[] = Array.isArray(parsed.tracks) ? parsed.tracks : [];
  for (const t of tracks as { file?: string; url?: string }[]) {
    if (!t.file && t.url) t.file = t.url;
  }

  return {
    file: parsed.file,
    headers: parsed.headers ?? {},
    tracks,
    allServers: parsed.allServers,
    server: parsed.server ?? null,
    download: parsed.download ?? null,
  };
}

async function fetchAllanimeStreamDirect(opts: {
  provider: AllanimeProviderName;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AllanimeStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await kittyApiFetch(
    `/provider/${opts.provider}/stream-direct?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: kittyStreamHeaders(),
    },
  );

  if (!res.ok) return null;

  const parsed = parseKittyStreamJson(await res.json(), res.ok);
  if (!parsed?.file) return null;

  const tracks: StreamTrack[] = Array.isArray(parsed.tracks) ? parsed.tracks : [];
  for (const t of tracks as { file?: string; url?: string }[]) {
    if (!t.file && t.url) t.file = t.url;
  }

  return {
    file: parsed.file,
    headers: parsed.headers ?? {},
    tracks,
    allServers: parsed.allServers,
    server: parsed.server ?? null,
    download: parsed.download ?? null,
  };
}

/** Resolve a named AllAnime/MKissa mirror via Kitty stream endpoint (one API call when possible). */
export async function fetchAllanimeVideoStream(opts: {
  provider: AllanimeProviderName;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  mirror?: AllanimeMirrorId | null;
  title?: string | null;
}): Promise<AllanimeStreamResult | null> {
  const mirror = opts.mirror ?? defaultAllanimeMirrorForProvider(opts.provider);

  const linkId = buildAllanimeMirrorLinkId({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    mirror,
  });
  const direct = await fetchAllanimeStreamByLinkId(opts.provider, linkId);
  if (direct?.file) {
    return {
      ...direct,
      server: direct.server ?? `${opts.provider} - ${mirror} (${opts.audio.toUpperCase()})`,
    };
  }

  const servers = await fetchAllanimeServers({
    provider: opts.provider,
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  for (const row of servers) {
    if (!mirrorMatchesRow(mirror, row)) continue;
    const stream = await fetchAllanimeStreamByLinkId(opts.provider, row.id);
    if (stream?.file) {
      return { ...stream, server: stream.server ?? row.name };
    }
  }

  return fetchAllanimeStreamDirect(opts);
}

const EMPTY_ALLANIME_CAPS: StreamCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

function mergeAllanimeCaps(...items: StreamCapabilities[]): StreamCapabilities {
  return {
    sub: items.some((c) => c.sub),
    dub: items.some((c) => c.dub),
    multi: items.some((c) => c.multi),
    softSub: items.some((c) => c.softSub),
    hardSub: items.some((c) => c.hardSub),
  };
}

function mirrorsByAudio(
  rows: AllanimeKittyServer[],
): Partial<Record<AllanimeMirrorId, string>> {
  const map: Partial<Record<AllanimeMirrorId, string>> = {};

  for (const row of enrichServerRows(rows)) {
    if (!map[row.mirror]) {
      map[row.mirror] = row.id;
    }
  }

  return map;
}

function buildMirrorCapabilities(inSub: boolean, inDub: boolean): StreamCapabilities | null {
  if (!inSub && !inDub) return null;

  return {
    sub: inSub,
    dub: inDub,
    multi: inSub && inDub,
    softSub: false,
    hardSub: inSub,
  };
}

/** Per-mirror sub/dub from AllAnime/MKissa servers list for an episode. */
export async function probeAllanimeEpisodeCapabilities(
  provider: AllanimeProviderName,
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<{
  provider: StreamCapabilities;
  servers: Partial<Record<AllanimeMirrorId, StreamCapabilities>>;
  serverRows: AllanimeKittyServer[];
}> {
  const [subRows, dubRows] = await Promise.all([
    fetchAllanimeServers({ provider, anilistId, episode, audio: "sub", title }),
    fetchAllanimeServers({ provider, anilistId, episode, audio: "dub", title }),
  ]);

  const subLinks = mirrorsByAudio(subRows);
  const dubLinks = mirrorsByAudio(dubRows);
  const serverRows = uniqueMirrorRows([...subRows, ...dubRows]);

  const servers: Partial<Record<AllanimeMirrorId, StreamCapabilities>> = {};
  let providerCaps = EMPTY_ALLANIME_CAPS;

  for (const row of serverRows) {
    const caps = buildMirrorCapabilities(
      Boolean(subLinks[row.mirror]),
      Boolean(dubLinks[row.mirror]),
    );
    if (!caps) continue;
    servers[row.mirror] = caps;
    providerCaps = mergeAllanimeCaps(providerCaps, caps);
  }

  return { provider: providerCaps, servers, serverRows };
}

/** Probe one mirror for sub/dub availability on an episode. */
export async function probeAllanimeMirrorCapabilities(
  provider: AllanimeProviderName,
  anilistId: number,
  episode: number,
  mirror: AllanimeMirrorId,
  title?: string | null,
): Promise<StreamCapabilities> {
  const { servers } = await probeAllanimeEpisodeCapabilities(
    provider,
    anilistId,
    episode,
    title,
  );
  return servers[mirror] ?? EMPTY_ALLANIME_CAPS;
}
