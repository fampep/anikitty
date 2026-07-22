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
 * Unknown / retired ids are dropped; missing active providers are inserted
 * near their {@link DEFAULT_PROVIDER_PRIORITY} neighbors (not dumped at the end).
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
      if (item === "Zenkai") {
        continue;
      }
      push(item);
    }
  }

  // Insert missing defaults at their preferred index relative to neighbors.
  for (const id of DEFAULT_PROVIDER_PRIORITY) {
    if (seen.has(id)) continue;
    const prefIdx = DEFAULT_PROVIDER_PRIORITY.indexOf(id);
    let insertAt = out.length;
    for (let i = prefIdx - 1; i >= 0; i--) {
      const neighbor = DEFAULT_PROVIDER_PRIORITY[i]!;
      const at = out.indexOf(neighbor);
      if (at >= 0) {
        insertAt = at + 1;
        break;
      }
    }
    out.splice(insertAt, 0, id);
    seen.add(id);
  }
  for (const id of KITTY_PROVIDERS) {
    // Adult-only providers stay out of the default order unless already saved.
    if (KITTY_PROVIDER_META.find((p) => p.id === id)?.adultOnly) continue;
    push(id);
  }

  return out;
}

/** Effective priority list — empty/invalid input falls back to site defaults. */
export function resolveProviderOrder(custom?: KittyProvider[] | null): KittyProvider[] {
  if (!custom?.length) return sanitizeProviderOrder(DEFAULT_PROVIDER_PRIORITY);
  return sanitizeProviderOrder(custom);
}

/** Coerce a saved default provider id against the active list. */
export function sanitizeDefaultProvider(
  value: unknown,
  order?: KittyProvider[] | null,
): KittyProvider {
  const resolved = resolveProviderOrder(order);
  if (typeof value === "string" && isActiveKittyProvider(value)) return value;
  return resolved[0] ?? DEFAULT_KITTY_PROVIDER;
}

/**
 * Try order for auto-pick / fallback: explicit default first, then the rest of
 * `providerOrder` without duplicating.
 */
export function buildTryOrder(
  customOrder?: KittyProvider[] | null,
  defaultProvider?: KittyProvider | null,
): KittyProvider[] {
  const order = resolveProviderOrder(customOrder);
  const preferred = sanitizeDefaultProvider(defaultProvider, order);
  return [preferred, ...order.filter((id) => id !== preferred)];
}

export function getPreferredDefaultProvider(
  customOrder?: KittyProvider[] | null,
  defaultProvider?: KittyProvider | null,
): KittyProvider {
  return sanitizeDefaultProvider(defaultProvider, customOrder);
}

/** Auto-fallback sequence: user default + priority first, then remaining featured / active. */
export function buildProviderFallbackOrder(
  custom?: KittyProvider[] | null,
  defaultProvider?: KittyProvider | null,
  opts?: { includeAdult?: boolean },
): KittyProvider[] {
  const featured = KITTY_PROVIDER_META.filter((p) => p.group === "featured").map((p) => p.id);
  const ordered: KittyProvider[] = [
    ...buildTryOrder(custom, defaultProvider),
    ...featured,
    ...KITTY_PROVIDERS,
  ];
  if (opts?.includeAdult) {
    ordered.unshift("HentaiHaven");
  }
  const seen = new Set<KittyProvider>();
  return ordered.filter((p) => {
    if (seen.has(p)) return false;
    const adultOnly = KITTY_PROVIDER_META.find((m) => m.id === p)?.adultOnly;
    if (adultOnly && !opts?.includeAdult) return false;
    seen.add(p);
    return true;
  });
}

export function arraysEqualProviderOrder(a: KittyProvider[], b: KittyProvider[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}

export function isSiteDefaultProviderOrder(
  order: KittyProvider[],
  defaultProvider?: KittyProvider | null,
): boolean {
  const orderMatches = arraysEqualProviderOrder(
    resolveProviderOrder(order),
    sanitizeProviderOrder(DEFAULT_PROVIDER_PRIORITY),
  );
  if (!orderMatches) return false;
  if (defaultProvider == null) return true;
  return sanitizeDefaultProvider(defaultProvider, order) === DEFAULT_KITTY_PROVIDER;
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

/** HTML5 / button drag reorder by index. */
export function reorderProviderAt(
  order: KittyProvider[],
  fromIndex: number,
  toIndex: number,
): KittyProvider[] {
  const list = resolveProviderOrder(order);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
