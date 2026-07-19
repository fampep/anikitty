import {
  DEFAULT_KITTY_PROVIDER,
  DEFAULT_PROVIDER_PRIORITY,
  KITTY_PROVIDERS,
  KITTY_PROVIDER_META,
  isActiveKittyProvider,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";

/**
 * Normalize a saved / remote provider order into a complete active list.
 * Unknown / retired ids are dropped; missing active providers are appended
 * in site-default priority order.
 */
export function sanitizeProviderOrder(raw: unknown): KittyProvider[] {
  const seen = new Set<KittyProvider>();
  const out: KittyProvider[] = [];

  const push = (id: string) => {
    if (!isActiveKittyProvider(id) || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== "string") continue;
      if (item === "AllAnime") {
        push("MKissa");
        continue;
      }
      if (item === "AnimeStream" || item === "KaaLt") {
        push("KickAssAnime");
        continue;
      }
      if (item === "ReAnime") {
        push("KuroHost");
        continue;
      }
      if (item === "AniZone") {
        push("AniNeko");
        continue;
      }
      push(item);
    }
  }

  for (const id of DEFAULT_PROVIDER_PRIORITY) push(id);
  for (const id of KITTY_PROVIDERS) push(id);

  return out;
}

/** Effective priority list — empty/invalid input falls back to site defaults. */
export function resolveProviderOrder(custom?: KittyProvider[] | null): KittyProvider[] {
  if (!custom?.length) return sanitizeProviderOrder(DEFAULT_PROVIDER_PRIORITY);
  return sanitizeProviderOrder(custom);
}

export function getPreferredDefaultProvider(custom?: KittyProvider[] | null): KittyProvider {
  return resolveProviderOrder(custom)[0] ?? DEFAULT_KITTY_PROVIDER;
}

/** Auto-fallback sequence: user priority first, then remaining featured / active. */
export function buildProviderFallbackOrder(custom?: KittyProvider[] | null): KittyProvider[] {
  const featured = KITTY_PROVIDER_META.filter((p) => p.group === "featured").map((p) => p.id);
  const ordered: KittyProvider[] = [
    ...resolveProviderOrder(custom),
    ...featured,
    ...KITTY_PROVIDERS,
  ];
  const seen = new Set<KittyProvider>();
  return ordered.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

export function arraysEqualProviderOrder(a: KittyProvider[], b: KittyProvider[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export function isSiteDefaultProviderOrder(order: KittyProvider[]): boolean {
  return arraysEqualProviderOrder(
    resolveProviderOrder(order),
    sanitizeProviderOrder(DEFAULT_PROVIDER_PRIORITY),
  );
}

export function moveProviderInOrder(
  order: KittyProvider[],
  id: KittyProvider,
  action: "up" | "down" | "first" | "last",
): KittyProvider[] {
  const list = resolveProviderOrder(order);
  const idx = list.indexOf(id);
  if (idx < 0) return list;

  const next = [...list];
  next.splice(idx, 1);

  if (action === "first") {
    next.unshift(id);
  } else if (action === "last") {
    next.push(id);
  } else if (action === "up") {
    const insertAt = Math.max(0, idx - 1);
    next.splice(insertAt, 0, id);
  } else {
    const insertAt = Math.min(next.length, idx + 1);
    next.splice(insertAt, 0, id);
  }

  return next;
}
