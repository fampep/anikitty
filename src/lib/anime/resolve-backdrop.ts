type ArtItem = { image?: string | null; title?: string | null };

type MappingImages = {
  fanart?: string | null;
  banner?: string | null;
  poster?: string | null;
  artworks?: {
    backgrounds?: ArtItem[];
    banners?: ArtItem[];
    fanart?: ArtItem[];
  } | null;
} | null | undefined;

function firstUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return null;
}

function preferTvdb(items: ArtItem[] | undefined): string | null {
  if (!items?.length) return null;
  const tvdb = items.find((i) => i.title === "TVDB" && i.image);
  return firstUrl(tvdb?.image, items[0]?.image);
}

/** Prefer TVDB backgrounds/fanart, then AniList banner, then other art. */
export function resolveAnimeBackdropUrl(opts: {
  images?: MappingImages;
  anilistBanner?: string | null;
  infoBanner?: string | null;
  poster?: string | null;
}): string | null {
  const art = opts.images?.artworks;
  return firstUrl(
    preferTvdb(art?.backgrounds),
    preferTvdb(art?.fanart),
    opts.images?.fanart,
    opts.anilistBanner,
    opts.images?.banner,
    preferTvdb(art?.banners),
    art?.backgrounds?.[0]?.image,
    art?.banners?.[0]?.image,
    opts.infoBanner,
    opts.poster,
  );
}
