import { withAuth } from "@/lib/auth/auth-fetch";

const KEY = "kitty:history-notes";

export type HistoryNotesMap = Record<string, string>;

function readLocal(): HistoryNotesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryNotesMap) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocal(next: HistoryNotesMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("anikitty:history-notes"));
  } catch {
    /* quota */
  }
}

/** Guest / sync cache. Prefer `loadHistoryNotes` when signed in. */
export function getHistoryNotes(): HistoryNotesMap {
  return readLocal();
}

export async function loadHistoryNotes(signedIn: boolean): Promise<HistoryNotesMap> {
  if (!signedIn) return readLocal();
  try {
    const res = await fetch("/api/account/anime-notes", withAuth());
    if (res.ok) {
      const data = (await res.json()) as { notes?: HistoryNotesMap };
      const notes = data.notes && typeof data.notes === "object" ? data.notes : {};
      writeLocal(notes);
      return notes;
    }
  } catch {
    /* fall through */
  }
  return readLocal();
}

export function setHistoryNote(animeId: string, note: string): HistoryNotesMap {
  const next = { ...readLocal() };
  const trimmed = note.trim().slice(0, 2000);
  if (!trimmed) delete next[animeId];
  else next[animeId] = trimmed;
  writeLocal(next);

  void fetch(
    "/api/account/anime-notes",
    withAuth({
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animeId, note: trimmed }),
    }),
  ).catch(() => {
    /* guest or offline — local cache remains */
  });

  return next;
}
