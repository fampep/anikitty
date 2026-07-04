/** Shared Miruro types/constants safe for client bundles (no Kitty API fetch). */

export const MIRURO_SUB_PROVIDERS = ["bonk", "ally", "kiwi", "moo", "pewe"] as const;

export const MIRURO_PIPE_PROVIDERS = [
  { id: "bonk", label: "Bonk", native: true },
  { id: "kiwi", label: "Kiwi", native: true },
  { id: "ally", label: "Ally", native: true },
  { id: "moo", label: "Moo", native: true },
  { id: "pewe", label: "Pewe", native: true },
  { id: "bee", label: "Bee", native: true },
  { id: "hop", label: "Hop", native: true },
  { id: "nun", label: "Nun", native: false },
  { id: "bun", label: "Bun", native: false },
  { id: "twin", label: "Twin", native: false },
  { id: "cog", label: "Cog", native: false },
] as const;

export type MiruroPipeProviderId = (typeof MIRURO_PIPE_PROVIDERS)[number]["id"];

export const DEFAULT_MIRURO_PIPE_PROVIDER: MiruroPipeProviderId = "bonk";

export const MIRURO_VIDEO_PROVIDER_ORDER: MiruroPipeProviderId[] = [
  "bonk",
  "kiwi",
  "ally",
  "moo",
  "pewe",
  "bee",
  "hop",
];

export type MiruroSkipTimes = {
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
};

export function isMiruroPipeProviderId(value: string): value is MiruroPipeProviderId {
  return MIRURO_PIPE_PROVIDERS.some((p) => p.id === value);
}
