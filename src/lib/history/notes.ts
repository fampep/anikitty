const KEY = "kitty:history-notes";

export type HistoryNotesMap = Record<string, string>;

export function getHistoryNotes(): HistoryNotesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryNotesMap) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function setHistoryNote(animeId: string, note: string): HistoryNotesMap {
  const next = { ...getHistoryNotes() };
  const trimmed = note.trim().slice(0, 2000);
  if (!trimmed) delete next[animeId];
  else next[animeId] = trimmed;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("anikitty:history-notes"));
  } catch {
    /* quota */
  }
  return next;
}
