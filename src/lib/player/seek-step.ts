export const PLAYER_SEEK_STEP_OPTIONS = [5, 10, 15, 30] as const;

export type PlayerSeekStep = (typeof PLAYER_SEEK_STEP_OPTIONS)[number];

export const DEFAULT_PLAYER_SEEK_STEP: PlayerSeekStep = 10;

export function sanitizeSeekStepSeconds(value: unknown): PlayerSeekStep {
  const n = typeof value === "number" ? value : Number(value);
  return (PLAYER_SEEK_STEP_OPTIONS as readonly number[]).includes(n)
    ? (n as PlayerSeekStep)
    : DEFAULT_PLAYER_SEEK_STEP;
}
