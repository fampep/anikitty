export const DISCORD_PROMPT_STORAGE_KEY = "anikitty-discord-prompt-v1";

export function readDiscordPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DISCORD_PROMPT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDiscordPromptDismissed(): void {
  try {
    localStorage.setItem(DISCORD_PROMPT_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
