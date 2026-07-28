/** Emoji shortcodes, categories, and recent/frequent helpers for chat. */

export const CHAT_EMOJI_GROUPS: { id: string; emojis: string[] }[] = [
  {
    id: "popular",
    emojis: ["😂", "😭", "🥺", "😍", "🤣", "😩", "😅", "😤", "💀", "😳", "🥰", "🤔", "😏", "😱", "🫠", "😢"],
  },
  {
    id: "reactions",
    emojis: ["❤️", "🔥", "💯", "✨", "👍", "👎", "💔", "🙌", "🤌", "⭐", "💫", "👏", "🫶", "💪", "🤦", "🤷"],
  },
  {
    id: "anime",
    emojis: ["🌸", "🗡️", "⚔️", "🐉", "🌙", "🎌", "🧠", "👁️", "✊", "🩸", "🌊", "⚡", "🏹", "👊", "🫡", "🤯"],
  },
  {
    id: "faces",
    emojis: ["😎", "🤓", "🥱", "😡", "🤩", "🫢", "😬", "🙃", "😴", "🤧", "🥴", "😫", "🤑", "😒", "🙄", "😈"],
  },
];

export const CHAT_EMOJI_SHORTCODES: Record<string, string> = {
  smile: "😄",
  smiling: "😊",
  grin: "😁",
  joy: "😂",
  rofl: "🤣",
  sob: "😭",
  cry: "😢",
  heart: "❤️",
  fire: "🔥",
  thumbsup: "👍",
  thumbsdown: "👎",
  ok: "👌",
  clap: "👏",
  wave: "👋",
  eyes: "👀",
  thinking: "🤔",
  shrug: "🤷",
  skull: "💀",
  star: "⭐",
  sparkles: "✨",
  hundred: "💯",
  blush: "😊",
  wink: "😉",
  cool: "😎",
  angry: "😡",
  shocked: "😱",
  please: "🥺",
  kiss: "😘",
  party: "🥳",
  tada: "🎉",
  rocket: "🚀",
  check: "✅",
  x: "❌",
  warning: "⚠️",
};

const RECENT_KEY = "anikitty:chat:emoji:recent";
const FREQ_KEY = "anikitty:chat:emoji:freq";
const MAX_RECENT = 24;

export function getRecentEmojis(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e === "string") : [];
  } catch {
    return [];
  }
}

export function getFrequentEmojis(limit = 16): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FREQ_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([e]) => e);
  } catch {
    return [];
  }
}

export function recordEmojiUsage(emoji: string) {
  if (typeof window === "undefined" || !emoji) return;
  try {
    const recent = getRecentEmojis().filter((e) => e !== emoji);
    recent.unshift(emoji);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));

    const raw = localStorage.getItem(FREQ_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, number>;
    map[emoji] = (map[emoji] ?? 0) + 1;
    localStorage.setItem(FREQ_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

const SHORTCODE_TOKEN = /(?:^|[^A-Za-z0-9_]):([a-z0-9_+-]{1,32})$/i;

export function matchEmojiShortcodeToken(beforeCaret: string): string | null {
  const m = beforeCaret.match(SHORTCODE_TOKEN);
  return m?.[1]?.toLowerCase() ?? null;
}

export function suggestEmojiShortcodes(query: string, limit = 8): { code: string; emoji: string }[] {
  const q = query.toLowerCase();
  const out: { code: string; emoji: string }[] = [];
  for (const [code, emoji] of Object.entries(CHAT_EMOJI_SHORTCODES)) {
    if (!q || code.includes(q) || code.startsWith(q)) {
      out.push({ code, emoji });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function applyEmojiShortcode(
  value: string,
  caret: number,
  code: string,
  emoji: string,
): { next: string; caret: number } {
  const before = value.slice(0, caret);
  const m = before.match(SHORTCODE_TOKEN);
  if (!m) {
    const next = `${value.slice(0, caret)}${emoji}${value.slice(caret)}`;
    return { next, caret: caret + emoji.length };
  }
  const start = caret - m[1].length - 1;
  const next = `${value.slice(0, start)}${emoji}${value.slice(caret)}`;
  return { next, caret: start + emoji.length };
}
