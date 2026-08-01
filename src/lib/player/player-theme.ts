/** KittyPlayer chrome theme — swaps `--ak-player-*` CSS vars via `data-player-theme`. */
export type PlayerTheme =
  | "default"
  | "amoled"
  | "purple"
  | "glass"
  | "compact"
  | "minimal";

export const PLAYER_THEMES: PlayerTheme[] = [
  "default",
  "amoled",
  "purple",
  "glass",
  "compact",
  "minimal",
];

export const DEFAULT_PLAYER_THEME: PlayerTheme = "default";

export const PLAYER_THEME_LABELS: Record<PlayerTheme, string> = {
  default: "Default Dark",
  amoled: "AMOLED Black",
  purple: "Purple",
  glass: "Glass",
  compact: "Compact",
  minimal: "Minimal",
};

export function sanitizePlayerTheme(value: unknown): PlayerTheme {
  if (typeof value === "string" && (PLAYER_THEMES as string[]).includes(value)) {
    return value as PlayerTheme;
  }
  return DEFAULT_PLAYER_THEME;
}
