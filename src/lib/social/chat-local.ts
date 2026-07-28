import type { ChatMessage } from "@/lib/social/chat";

const DRAFT_KEY = "anikitty:chat:draft";
const PINS_KEY = "anikitty:chat:pins";
const LAST_READ_KEY = "anikitty:chat:lastReadId";
const REACTIONS_KEY = "anikitty:chat:reactions";

export type ChatPinnedMessage = {
  id: string;
  body: string;
  gifUrl: string | null;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  pinnedAt: number;
};

export type ChatReactionMap = Record<string, Record<string, string[]>>;
// messageId -> emoji -> userIds

export function loadChatDraft(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveChatDraft(value: string) {
  if (typeof window === "undefined") return;
  try {
    if (!value) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, value.slice(0, 1000));
  } catch {
    /* ignore */
  }
}

export function loadPinnedMessages(): ChatPinnedMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINS_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatPinnedMessage[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePinnedMessages(pins: ChatPinnedMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function pinChatMessage(message: ChatMessage): ChatPinnedMessage[] {
  const pins = loadPinnedMessages().filter((p) => p.id !== message.id);
  pins.unshift({
    id: message.id,
    body: message.body,
    gifUrl: message.gifUrl,
    username: message.username,
    avatarUrl: message.avatarUrl,
    createdAt: message.createdAt,
    pinnedAt: Date.now(),
  });
  savePinnedMessages(pins);
  return pins;
}

export function unpinChatMessage(id: string): ChatPinnedMessage[] {
  const pins = loadPinnedMessages().filter((p) => p.id !== id);
  savePinnedMessages(pins);
  return pins;
}

export function loadLastReadMessageId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_READ_KEY);
  } catch {
    return null;
  }
}

export function saveLastReadMessageId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!id) localStorage.removeItem(LAST_READ_KEY);
    else localStorage.setItem(LAST_READ_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Device-local reactions until a server reactions API ships. */
export function loadLocalReactions(): ChatReactionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatReactionMap) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalReactions(map: ChatReactionMap) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REACTIONS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function toggleLocalReaction(
  map: ChatReactionMap,
  messageId: string,
  emoji: string,
  userId: string,
): ChatReactionMap {
  const next: ChatReactionMap = { ...map, [messageId]: { ...(map[messageId] ?? {}) } };
  const users = new Set(next[messageId][emoji] ?? []);
  if (users.has(userId)) users.delete(userId);
  else users.add(userId);
  if (users.size === 0) delete next[messageId][emoji];
  else next[messageId][emoji] = Array.from(users);
  if (Object.keys(next[messageId]).length === 0) delete next[messageId];
  saveLocalReactions(next);
  return next;
}

export type ChatReactionSummary = {
  emoji: string;
  count: number;
  me: boolean;
};

export function summarizeReactions(
  map: ChatReactionMap,
  messageId: string,
  userId: string | null | undefined,
): ChatReactionSummary[] {
  const bucket = map[messageId];
  if (!bucket) return [];
  return Object.entries(bucket)
    .map(([emoji, users]) => ({
      emoji,
      count: users.length,
      me: !!userId && users.includes(userId),
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
}
