import { getKittyApiBase, kittyApiHeaders } from "@/lib/kitty/kitty-api";
import type { ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/providers/miruro-api";

/** Known Lunar Vermillion / 3rd mirrors (host keys from Kitty linkId). */
export const LUNAR_SERVERS = [
  { id: "beep", label: "Beep", hint: "PlayEng / Kwik · soft sub · fast", names: ["beep", "Beep"] },
  { id: "mimi", label: "Mimi", hint: "Hard-sub HLS · fastest", names: ["mimi", "Mimi"] },
  { id: "yuki", label: "Yuki", hint: "MegaPlay · cluster proxy", names: ["yuki", "Yuki"] },
  { id: "miku", label: "Miku", hint: "MegaCloud · cluster proxy", names: ["miku", "Miku"] },
  { id: "vee", label: "Vee", hint: "Direct / cluster · soft sub", names: ["vee", "Vee"] },
  { id: "neko", label: "Neko", hint: "Hard-sub HLS", names: ["neko", "Neko"] },
  { id: "uwu", label: "Uwu", hint: "Hard-sub HLS", names: ["uwu", "Uwu"] },
  { id: "kami", label: "Kami", hint: "cluster.lunaranime.ru proxy", names: ["kami", "Kami"] },
  { id: "sv-2", label: "FlixCloud", hint: "3rd provider · FlixCloud embed", names: ["sv-2", "FlixCloud"] },
] as const;

export type LunarServerId = (typeof LUNAR_SERVERS)[number]["id"];

export const DEFAULT_LUNAR_SERVER: LunarServerId = "beep";

const SOFT_SUB_HOSTS = new Set<LunarServerId>(["beep", "vee"]);

export type LunarKittyServer = {
  id: string;
  name: string;
};

export type LunarStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
};

type LunarLinkId = {
  slug?: string;
  id?: string;
  ep?: number;
  audio?: string;
  host?: string;
  kind?: string;
  tip?: string;
};

function lunarDataIds(anilistId: number, episode: number): string {
  const id = String(anilistId);
  return JSON.stringify({ slug: id, id, ep: episode });
}

export function isLunarServerId(value: string): value is LunarServerId {
  return LUNAR_SERVERS.some((s) => s.id === value);
}

export function defaultLunarServerForMode(_mode: ProviderAudioMode): LunarServerId {
  return DEFAULT_LUNAR_SERVER;
}

function serverMeta(serverId: LunarServerId) {
  return LUNAR_SERVERS.find((s) => s.id === serverId);
}

function nameMatchesServer(serverId: LunarServerId, label: string): boolean {
  const meta = serverMeta(serverId);
  if (!meta) return false;
  const normalized = label.trim();
  if (!normalized) return false;
  return meta.names.some(
    (n) =>
      normalized === n ||
      normalized.includes(` - ${n} `) ||
      normalized.includes(` - ${n}(`) ||
      normalized.includes(` - ${n} [`) ||
      normalized.endsWith(` - ${n}`),
  );
}

function serverMatchesRow(serverId: LunarServerId, link: LunarLinkId, rowName: string): boolean {
  if (link.host === serverId) return true;
  return nameMatchesServer(serverId, rowName);
}

export async function fetchLunarServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<LunarKittyServer[]> {
  const params = new URLSearchParams({
    dataIds: lunarDataIds(opts.anilistId, opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await fetch(`${getKittyApiBase()}/provider/Lunar/servers?${params.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: kittyApiHeaders(),
  });

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => ({
      id: String(row?.id ?? ""),
      name: String(row?.name ?? "").trim(),
    }))
    .filter((row) => row.id && row.name);
}

async function fetchLunarStreamByLinkId(linkId: string): Promise<LunarStreamResult | null> {
  const params = new URLSearchParams({ linkId });
  const res = await fetch(`${getKittyApiBase()}/provider/Lunar/stream?${params.toString()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
    headers: kittyApiHeaders(),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.file) return null;

  const tracks: StreamTrack[] = Array.isArray(data.tracks) ? data.tracks : [];
  for (const t of tracks as { file?: string; url?: string }[]) {
    if (!t.file && t.url) t.file = t.url;
  }

  return {
    file: data.file,
    headers: data.headers ?? {},
    tracks,
    skipTimes: data.skipTimes,
    server: data.serverName ?? data.server ?? null,
    download: data.download ?? null,
  };
}

async function fetchLunarStreamDirect(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<LunarStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await fetch(
    `${getKittyApiBase()}/provider/Lunar/stream-direct?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
      headers: kittyApiHeaders(),
    },
  );

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.file) return null;

  const tracks: StreamTrack[] = Array.isArray(data.tracks) ? data.tracks : [];
  for (const t of tracks as { file?: string; url?: string }[]) {
    if (!t.file && t.url) t.file = t.url;
  }

  return {
    file: data.file,
    headers: data.headers ?? {},
    tracks,
    skipTimes: data.skipTimes,
    server: data.serverName ?? data.server ?? null,
    download: data.download ?? null,
  };
}

/** Resolve a named Lunar server via Kitty servers + stream endpoints. */
export async function fetchLunarVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  serverId?: LunarServerId | null;
  title?: string | null;
}): Promise<LunarStreamResult | null> {
  const serverId = opts.serverId ?? DEFAULT_LUNAR_SERVER;

  const servers = await fetchLunarServers({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  for (const row of servers) {
    try {
      const link = JSON.parse(row.id) as LunarLinkId;
      if (!serverMatchesRow(serverId, link, row.name)) continue;
      const stream = await fetchLunarStreamByLinkId(row.id);
      if (stream?.file) {
        return { ...stream, server: stream.server ?? row.name };
      }
    } catch {
      continue;
    }
  }

  return fetchLunarStreamDirect(opts);
}

export type LunarServerCapabilities = {
  sub: boolean;
  dub: boolean;
  multi: boolean;
  softSub: boolean;
  hardSub: boolean;
};

const EMPTY_LUNAR_CAPS: LunarServerCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

function mergeLunarCaps(...items: LunarServerCapabilities[]): LunarServerCapabilities {
  return {
    sub: items.some((c) => c.sub),
    dub: items.some((c) => c.dub),
    multi: items.some((c) => c.multi),
    softSub: items.some((c) => c.softSub),
    hardSub: items.some((c) => c.hardSub),
  };
}

function serversByLunarId(rows: LunarKittyServer[]): Partial<Record<LunarServerId, string>> {
  const map: Partial<Record<LunarServerId, string>> = {};

  for (const row of rows) {
    try {
      const link = JSON.parse(row.id) as LunarLinkId;
      for (const server of LUNAR_SERVERS) {
        if (serverMatchesRow(server.id, link, row.name) && !map[server.id]) {
          map[server.id] = row.id;
        }
      }
    } catch {
      continue;
    }
  }

  return map;
}

function buildLunarServerCapabilities(
  serverId: LunarServerId,
  subLinks: Partial<Record<LunarServerId, string>>,
  dubLinks: Partial<Record<LunarServerId, string>>,
): LunarServerCapabilities | null {
  const inSub = Boolean(subLinks[serverId]);
  const inDub = Boolean(dubLinks[serverId]);
  if (!inSub && !inDub) return null;

  const softSub = inSub && SOFT_SUB_HOSTS.has(serverId);

  return {
    sub: inSub,
    dub: inDub,
    multi: inSub && inDub,
    softSub,
    hardSub: inSub && !softSub,
  };
}

/** Probe one Lunar server for sub/dub availability on an episode. */
export async function probeLunarServerCapabilities(
  anilistId: number,
  episode: number,
  serverId: LunarServerId,
  title?: string | null,
): Promise<LunarServerCapabilities> {
  const [subLinks, dubLinks] = await Promise.all([
    fetchLunarServers({ anilistId, episode, audio: "sub", title }).then(serversByLunarId),
    fetchLunarServers({ anilistId, episode, audio: "dub", title }).then(serversByLunarId),
  ]);

  const caps = buildLunarServerCapabilities(serverId, subLinks, dubLinks);
  return caps ?? EMPTY_LUNAR_CAPS;
}

/** Per-server sub/dub from Lunar servers list. */
export async function probeLunarEpisodeCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<{
  provider: LunarServerCapabilities;
  servers: Partial<Record<LunarServerId, LunarServerCapabilities>>;
}> {
  const [subLinks, dubLinks] = await Promise.all([
    fetchLunarServers({ anilistId, episode, audio: "sub", title }).then(serversByLunarId),
    fetchLunarServers({ anilistId, episode, audio: "dub", title }).then(serversByLunarId),
  ]);

  const servers: Partial<Record<LunarServerId, LunarServerCapabilities>> = {};
  let provider = EMPTY_LUNAR_CAPS;

  for (const server of LUNAR_SERVERS) {
    const caps = buildLunarServerCapabilities(server.id, subLinks, dubLinks);
    if (!caps) continue;
    servers[server.id] = caps;
    provider = mergeLunarCaps(provider, caps);
  }

  return { provider, servers };
}
