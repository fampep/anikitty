// Locally-stored history of anime the user opened, for a "Recently viewed" rail.

const KEY = "kitty:recently-viewed";
const MAX = 24;

export type RecentlyViewedAnime = {
  id: string;
  name: string;
  poster: string;
  at: number;
};

export function getRecentlyViewed(): RecentlyViewedAnime[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as RecentlyViewedAnime[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Record a viewed anime (most-recent first, deduped by id, capped). */
export function recordRecentlyViewed(anime: { id: string; name: string; poster: string }): void {
  if (typeof window === "undefined") return;
  if (!anime.id || !anime.name || !anime.poster) return;
  try {
    const list = getRecentlyViewed().filter((a) => a.id !== anime.id);
    list.unshift({ id: anime.id, name: anime.name, poster: anime.poster, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new Event("anikitty:recently-viewed"));
  } catch {
    /* ignore quota errors */
  }
}
