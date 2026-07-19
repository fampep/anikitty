import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import { resolveProviderOrder } from "@/lib/kitty/provider-order";

const ANIME_PROVIDER_KEY = "kitty:provider-by-anime";
const PROVIDER_SCORES_KEY = "kitty:provider-scores";

type ProviderScores = Partial<Record<KittyProvider, { ok: number; fail: number }>>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function getAnimeProviderPreference(anilistId: number): KittyProvider | null {
  const map = readJson<Record<string, KittyProvider>>(ANIME_PROVIDER_KEY, {});
  const saved = map[String(anilistId)];
  if (!saved) return null;
  if (saved === "AllAnime") return "MKissa";
  return saved;
}

export function saveAnimeProviderPreference(anilistId: number, provider: KittyProvider) {
  const map = readJson<Record<string, KittyProvider>>(ANIME_PROVIDER_KEY, {});
  map[String(anilistId)] = provider;
  writeJson(ANIME_PROVIDER_KEY, map);
}

export function recordProviderOutcome(provider: KittyProvider, success: boolean) {
  const scores = readJson<ProviderScores>(PROVIDER_SCORES_KEY, {});
  const row = scores[provider] ?? { ok: 0, fail: 0 };
  if (success) row.ok += 1;
  else row.fail += 1;
  scores[provider] = row;
  writeJson(PROVIDER_SCORES_KEY, scores);
}

export function providerSuccessScore(provider: KittyProvider): number {
  const scores = readJson<ProviderScores>(PROVIDER_SCORES_KEY, {});
  const row = scores[provider];
  if (!row) return 0;
  return row.ok - row.fail * 2;
}

/** Sort providers: capability-available first, then per-anime pref, then user/site priority. */
export function sortProvidersForPicker<T extends { id: KittyProvider }>(
  items: T[],
  opts: {
    preferredId?: KittyProvider | null;
    availableIds?: Set<KittyProvider> | null;
    /** User preference order; defaults to site {@link DEFAULT_PROVIDER_PRIORITY}. */
    priorityOrder?: KittyProvider[] | null;
  } = {},
): T[] {
  const priority = new Map(resolveProviderOrder(opts.priorityOrder).map((id, i) => [id, i]));

  return [...items].sort((a, b) => {
    const aAvail = opts.availableIds ? opts.availableIds.has(a.id) : true;
    const bAvail = opts.availableIds ? opts.availableIds.has(b.id) : true;
    if (aAvail !== bAvail) return aAvail ? -1 : 1;

    if (opts.preferredId) {
      if (a.id === opts.preferredId) return -1;
      if (b.id === opts.preferredId) return 1;
    }

    const pa = priority.get(a.id) ?? 999;
    const pb = priority.get(b.id) ?? 999;
    if (pa !== pb) return pa - pb;

    return providerSuccessScore(b.id) - providerSuccessScore(a.id);
  });
}

export const FALLBACK_HINT_KEY = "kitty:auto-fallback-hint-seen";

export function hasSeenAutoFallbackHint(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(FALLBACK_HINT_KEY) === "1";
}

export function markAutoFallbackHintSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(FALLBACK_HINT_KEY, "1");
}
