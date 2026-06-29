import { getKittyApiBase, kittyApiHeaders } from "@/lib/kitty-api";
import { isSubtitleTrack, type StreamTrack } from "@/lib/subtitle-track-utils";
import type { MiruroSkipTimes } from "@/lib/miruro-api";

/** Japanese audio (soft subs via hard_subs on media response). */
export const ANIMESTREAM_SUB_LOCALE = "ja-JP";

/** Default English dub when multiple locales exist. */
export const DEFAULT_ANIMESTREAM_DUB_LOCALE = "en-US";

export type AnimeStreamLocale = string;

export type AnimeStreamServerOption = {
  locale: AnimeStreamLocale;
  label: string;
};

export type AnimeStreamKittyServer = {
  id: string;
  name: string;
};

export type AnimeStreamStreamResult = {
  file: string;
  headers: Record<string, string>;
  tracks: StreamTrack[];
  skipTimes?: MiruroSkipTimes;
  server?: string | null;
  download?: string | null;
  locale?: string | null;
};

type AnimeStreamLinkId = {
  locale?: string;
  audio?: string;
  contentId?: string;
  seriesId?: string;
  seasonId?: string;
  preferredLocale?: string;
  mediaType?: string;
};

const LOCALE_NAME_HINTS: Array<{ pattern: RegExp; locale: string }> = [
  { pattern: /japanese/i, locale: "ja-JP" },
  { pattern: /\benglish\b/i, locale: "en-US" },
  { pattern: /\bgerman\b/i, locale: "de-DE" },
  { pattern: /\bhindi\b/i, locale: "hi-IN" },
  { pattern: /spanish/i, locale: "es-419" },
  { pattern: /portuguese/i, locale: "pt-BR" },
  { pattern: /\btamil\b/i, locale: "ta-IN" },
  { pattern: /\btelugu\b/i, locale: "te-IN" },
];

const SAFE_LOCALE = /^[a-z]{2,3}(-[A-Za-z0-9]+)?$/;

export function isAnimeStreamLocale(value: string): boolean {
  return SAFE_LOCALE.test(value);
}

function animestreamDataIds(
  anilistId: number,
  episode: number,
  audio: "sub" | "dub",
  title?: string | null,
): string {
  const payload: Record<string, unknown> = { anilistId, episode, audio };
  if (title?.trim()) payload.title = title.trim();
  return JSON.stringify(payload);
}

function parseLinkId(id: string): AnimeStreamLinkId | null {
  try {
    return JSON.parse(id) as AnimeStreamLinkId;
  } catch {
    return null;
  }
}

export function localeFromServerRow(row: AnimeStreamKittyServer): string {
  const link = parseLinkId(row.id);
  if (link?.locale && isAnimeStreamLocale(link.locale)) return link.locale;

  for (const hint of LOCALE_NAME_HINTS) {
    if (hint.pattern.test(row.name)) return hint.locale;
  }

  const paren = row.name.match(/\(([^)·]+)/);
  if (paren?.[1]) {
    const slug = paren[1].split("·")[0]?.trim().toLowerCase().replace(/\s+/g, "-");
    if (slug && slug.length <= 12) return slug;
  }

  return row.id.slice(0, 16);
}

export function labelFromServerRow(row: AnimeStreamKittyServer): string {
  const paren = row.name.match(/\(([^)]+)\)/);
  if (paren?.[1]) {
    return paren[1].replace(/\s*·\s*/g, " · ").trim();
  }
  return row.name.replace(/^AnimeStream\s*/i, "").trim() || row.name;
}

function linkMatchesLocale(link: AnimeStreamLinkId, locale: string): boolean {
  if (link.locale && link.locale === locale) return true;
  if (locale === ANIMESTREAM_SUB_LOCALE && link.locale === "ja-JP") return true;
  return false;
}

function serverMatchesLocale(
  row: AnimeStreamKittyServer,
  locale: string,
): boolean {
  const link = parseLinkId(row.id);
  if (link && linkMatchesLocale(link, locale)) return true;
  return localeFromServerRow(row) === locale;
}

export async function fetchAnimeStreamServers(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AnimeStreamKittyServer[]> {
  const params = new URLSearchParams({
    dataIds: animestreamDataIds(opts.anilistId, opts.episode, opts.audio, opts.title),
    audio: opts.audio,
  });

  const res = await fetch(
    `${getKittyApiBase()}/provider/AnimeStream/servers?${params.toString()}`,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: kittyApiHeaders(),
    },
  );

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

async function fetchAnimeStreamStreamByLinkId(
  linkId: string,
): Promise<AnimeStreamStreamResult | null> {
  const params = new URLSearchParams({ linkId });
  const res = await fetch(
    `${getKittyApiBase()}/provider/AnimeStream/stream?${params.toString()}`,
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

  const link = parseLinkId(linkId);

  return {
    file: data.file,
    headers: data.headers ?? {},
    tracks,
    skipTimes: data.skipTimes,
    server: data.serverName ?? data.server ?? null,
    download: data.download ?? null,
    locale: link?.locale ?? null,
  };
}

async function fetchAnimeStreamStreamDirect(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
}): Promise<AnimeStreamStreamResult | null> {
  const params = new URLSearchParams({
    anilistId: String(opts.anilistId),
    episode: String(opts.episode),
    audio: opts.audio,
  });
  if (opts.title?.trim()) params.set("title", opts.title.trim());

  const res = await fetch(
    `${getKittyApiBase()}/provider/AnimeStream/stream-direct?${params.toString()}`,
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
    locale: opts.audio === "sub" ? ANIMESTREAM_SUB_LOCALE : data.locale ?? null,
  };
}

/** Resolve AnimeStream HLS for an episode + audio locale. */
export async function fetchAnimeStreamVideoStream(opts: {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  locale?: AnimeStreamLocale | null;
  title?: string | null;
}): Promise<AnimeStreamStreamResult | null> {
  const wantLocale =
    opts.locale ??
    (opts.audio === "sub" ? ANIMESTREAM_SUB_LOCALE : DEFAULT_ANIMESTREAM_DUB_LOCALE);

  const servers = await fetchAnimeStreamServers({
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  for (const row of servers) {
    if (!serverMatchesLocale(row, wantLocale)) continue;
    const stream = await fetchAnimeStreamStreamByLinkId(row.id);
    if (stream?.file) {
      return { ...stream, server: stream.server ?? row.name, locale: wantLocale };
    }
  }

  if (opts.audio === "dub" && wantLocale !== DEFAULT_ANIMESTREAM_DUB_LOCALE) {
    for (const row of servers) {
      if (!serverMatchesLocale(row, DEFAULT_ANIMESTREAM_DUB_LOCALE)) continue;
      const stream = await fetchAnimeStreamStreamByLinkId(row.id);
      if (stream?.file) {
        return {
          ...stream,
          server: stream.server ?? row.name,
          locale: DEFAULT_ANIMESTREAM_DUB_LOCALE,
        };
      }
    }
  }

  for (const row of servers) {
    const stream = await fetchAnimeStreamStreamByLinkId(row.id);
    if (stream?.file) {
      return {
        ...stream,
        server: stream.server ?? row.name,
        locale: localeFromServerRow(row),
      };
    }
  }

  return fetchAnimeStreamStreamDirect(opts);
}

export type AnimeStreamServerCapabilities = {
  sub: boolean;
  dub: boolean;
  multi: boolean;
  softSub: boolean;
  hardSub: boolean;
};

const EMPTY_ANIMESTREAM_CAPS: AnimeStreamServerCapabilities = {
  sub: false,
  dub: false,
  multi: false,
  softSub: false,
  hardSub: false,
};

function countSubtitleTracks(tracks: StreamTrack[] | undefined): number {
  if (!tracks?.length) return 0;
  return tracks.filter(isSubtitleTrack).length;
}

async function probeLinkStream(linkId: string): Promise<{
  file?: string;
  subtitleTracks: number;
} | null> {
  const stream = await fetchAnimeStreamStreamByLinkId(linkId);
  if (!stream?.file) return null;
  return {
    file: stream.file,
    subtitleTracks: countSubtitleTracks(stream.tracks),
  };
}

function serversToOptions(rows: AnimeStreamKittyServer[]): AnimeStreamServerOption[] {
  const seen = new Set<string>();
  const out: AnimeStreamServerOption[] = [];
  for (const row of rows) {
    const locale = localeFromServerRow(row);
    if (seen.has(locale)) continue;
    seen.add(locale);
    out.push({ locale, label: labelFromServerRow(row) });
  }
  return out;
}

/** Probe AnimeStream for the active locale (or default). */
export async function probeAnimeStreamCapabilities(
  anilistId: number,
  episode: number,
  locale: AnimeStreamLocale,
  title?: string | null,
): Promise<AnimeStreamServerCapabilities> {
  const audio = locale === ANIMESTREAM_SUB_LOCALE ? "sub" : "dub";
  const servers = await fetchAnimeStreamServers({
    anilistId,
    episode,
    audio,
    title,
  });

  const row = servers.find((s) => serverMatchesLocale(s, locale));
  if (row) {
    const probe = await probeLinkStream(row.id);
    if (probe) {
      const softSub = probe.subtitleTracks > 0;
      return {
        sub: audio === "sub",
        dub: audio === "dub",
        multi: false,
        softSub,
        hardSub: audio === "sub" && !softSub,
      };
    }
  }

  const direct = await fetchAnimeStreamStreamDirect({
    anilistId,
    episode,
    audio,
    title,
  });
  if (!direct?.file) return EMPTY_ANIMESTREAM_CAPS;

  const softSub = countSubtitleTracks(direct.tracks) > 0;
  return {
    sub: audio === "sub",
    dub: audio === "dub",
    multi: false,
    softSub,
    hardSub: audio === "sub" && !softSub,
  };
}

/** Episode-level AnimeStream caps + dub locale list for the server picker. */
export async function probeAnimeStreamEpisodeCapabilities(
  anilistId: number,
  episode: number,
  title?: string | null,
): Promise<{
  provider: AnimeStreamServerCapabilities;
  locales: Partial<Record<string, AnimeStreamServerCapabilities>>;
  servers: AnimeStreamServerOption[];
}> {
  const [subServers, dubServers, subDirect] = await Promise.all([
    fetchAnimeStreamServers({ anilistId, episode, audio: "sub", title }),
    fetchAnimeStreamServers({ anilistId, episode, audio: "dub", title }),
    fetchAnimeStreamStreamDirect({ anilistId, episode, audio: "sub", title }),
  ]);

  const softSub =
    countSubtitleTracks(subDirect?.tracks) > 0 ||
    (await (async () => {
      const row = subServers[0];
      if (!row) return 0;
      const p = await probeLinkStream(row.id);
      return p?.subtitleTracks ?? 0;
    })()) > 0;

  const subAvailable = subServers.length > 0 || Boolean(subDirect?.file);
  const dubOptions = serversToOptions(dubServers);

  const locales: Partial<Record<string, AnimeStreamServerCapabilities>> = {};

  if (subAvailable) {
    locales[ANIMESTREAM_SUB_LOCALE] = {
      sub: true,
      dub: false,
      multi: false,
      softSub,
      hardSub: !softSub,
    };
  }

  for (const opt of dubOptions) {
    locales[opt.locale] = {
      sub: false,
      dub: true,
      multi: false,
      softSub: false,
      hardSub: false,
    };
  }

  const provider: AnimeStreamServerCapabilities = {
    sub: subAvailable,
    dub: dubOptions.length > 0,
    multi: false,
    softSub,
    hardSub: subAvailable && !softSub,
  };

  return { provider, locales, servers: dubOptions };
}
