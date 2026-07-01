/**
 * Nekos API v4 — free anime images with tags/character metadata.
 * @see https://nekosapi.com/about
 * @see https://nekosapi.com/docs/images/search
 */

const NEKOS_API = "https://api.nekosapi.com/v4";

export type NekosFanartImage = {
  image: string;
  thumbnail?: string;
  title?: string;
  sourceUrl?: string;
};

type NekosImageItem = {
  id: number;
  url: string;
  artist_name?: string | null;
  tags?: string[];
  source_url?: string | null;
};

function titleToTagCandidates(titles: string[]): string[] {
  const out = new Set<string>();
  for (const raw of titles) {
    const base = raw.split(/[:\-–|]/)[0]?.trim() ?? raw;
    const words = base
      .toLowerCase()
      .replace(/['']/g, "")
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["the", "and", "beyond", "journey"].includes(w));

    if (words.length) {
      out.add(words.join("_"));
      out.add(words[0]!);
      if (words.length >= 2) out.add(words.slice(0, 2).join("_"));
      if (words.length >= 3) out.add(words.slice(0, 3).join("_"));
    }
  }
  return [...out].slice(0, 8);
}

function searchTerms(titles: (string | null | undefined)[]): string[] {
  return titles
    .map((t) => (t ?? "").trim())
    .filter((t) => t.length >= 2)
    .flatMap((t) => {
      const base = t.split(/[:\-–|]/)[0]?.trim() ?? t;
      return [base, ...base.toLowerCase().split(/\s+/).filter((w) => w.length > 3)];
    });
}

async function fetchNekosImages(params: Record<string, string>): Promise<NekosImageItem[]> {
  const qs = new URLSearchParams(params);
  try {
    const res = await fetch(`${NEKOS_API}/images?${qs}`, {
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.items ?? []) as NekosImageItem[];
  } catch {
    return [];
  }
}

function itemToFanart(item: NekosImageItem): NekosFanartImage {
  const tagLabel = item.tags?.slice(0, 4).join(" · ");
  return {
    image: item.url,
    thumbnail: item.url,
    title: item.artist_name ? `by ${item.artist_name}` : tagLabel,
    sourceUrl: item.source_url ?? "https://nekosapi.com/about",
  };
}

function matchesAnime(item: NekosImageItem, terms: string[], tagCandidates: string[]): boolean {
  const tagHay = (item.tags ?? []).join(" ").toLowerCase();
  if (tagCandidates.some((t) => item.tags?.includes(t))) return true;
  return terms.some((term) => {
    const slug = term.toLowerCase().replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
    const plain = term.toLowerCase();
    return (
      (slug.length >= 3 && tagHay.includes(slug)) ||
      (plain.length >= 4 && tagHay.includes(plain.replace(/\s+/g, "_")))
    );
  });
}

function uniqueImages(items: NekosFanartImage[]): NekosFanartImage[] {
  const seen = new Set<string>();
  const out: NekosFanartImage[] = [];
  for (const item of items) {
    const key = item.image.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/** Search Nekos API images tagged for this anime title. */
export async function fetchNekosFanart(
  titles: (string | null | undefined)[],
  limit = 20,
): Promise<NekosFanartImage[]> {
  const terms = searchTerms(titles);
  if (!terms.length) return [];

  const tagCandidates = titleToTagCandidates(terms);
  const collected: NekosImageItem[] = [];

  const tagFetches = tagCandidates.map((tag) =>
    fetchNekosImages({
      tags: tag,
      limit: String(Math.min(limit, 25)),
      rating: "safe,suggestive",
    }),
  );
  const tagBatches = await Promise.all(tagFetches);
  for (const batch of tagBatches) collected.push(...batch);

  let relevant = collected.filter((item) => matchesAnime(item, terms, tagCandidates));

  if (relevant.length < Math.min(6, limit)) {
    const broad = await fetchNekosImages({
      limit: "100",
      rating: "safe",
      offset: String(Math.floor(Math.random() * 500)),
    });
    relevant = [...relevant, ...broad.filter((item) => matchesAnime(item, terms, tagCandidates))];
  }

  return uniqueImages(relevant.map(itemToFanart)).slice(0, limit);
}
