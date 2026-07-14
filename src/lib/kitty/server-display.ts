import { ANINEKO_SERVERS } from "@/lib/providers/anineko-config";
import { ANIWAVES_SERVERS } from "@/lib/providers/aniwaves-config";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

type ServerNameEntry = { label: string; names: readonly string[] };

function buildLookup(entries: ServerNameEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of entries) {
    for (const name of entry.names) {
      const token = normalizeToken(name);
      if (token) map.set(token, entry.label);
    }
  }
  return map;
}

const CODENAME_LOOKUP: Partial<Record<KittyProvider, Map<string, string>>> = {
  AniNeko: buildLookup(ANINEKO_SERVERS.map((s) => ({ label: s.label, names: s.names }))),
  AniWaves: buildLookup(ANIWAVES_SERVERS.map((s) => ({ label: s.label, names: s.names }))),
};

const SAFE_GENERIC_SERVER =
  /^(hd|sd|fhd|uhd|4k|2k|auto|main|backup|primary|secondary|alt|mirror|server|node|cdn|edge|source|src|stream|hls|mp4|s|p)[\s\-_]*\d*$/i;

const SAFE_QUALITY = /^\d{3,4}p?$/i;

export function resolveServerCodename(
  provider: KittyProvider,
  rawServer: string | null | undefined,
): string | null {
  if (!rawServer) return null;
  const trimmed = rawServer.trim();
  if (!trimmed) return null;

  const token = normalizeToken(trimmed);
  if (!token) return null;

  const providerLookup = CODENAME_LOOKUP[provider];
  const codename = providerLookup?.get(token);
  if (codename) return codename;

  const withoutAudio = trimmed.replace(/\s*\((sub|dub)\)\s*/gi, "").trim();
  if (SAFE_GENERIC_SERVER.test(withoutAudio) || SAFE_QUALITY.test(withoutAudio)) {
    return withoutAudio.toUpperCase();
  }

  return null;
}
