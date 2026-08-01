/** Per-moment timestamp bookmarks with notes — local to this browser. */
export type PlayerBookmark = {
  id: string;
  anilistId: number;
  episodeNumber: number;
  time: number;
  note: string;
  createdAt: number;
};

const STORAGE_KEY = "kitty:player-bookmarks";

function readAll(): PlayerBookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: PlayerBookmark[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota */
  }
}

export function getBookmarks(
  anilistId: number,
  episodeNumber: number,
): PlayerBookmark[] {
  return readAll()
    .filter((b) => b.anilistId === anilistId && b.episodeNumber === episodeNumber)
    .sort((a, b) => a.time - b.time);
}

export function addBookmark(
  anilistId: number,
  episodeNumber: number,
  time: number,
  note: string,
): PlayerBookmark {
  const row: PlayerBookmark = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    anilistId,
    episodeNumber,
    time: Math.max(0, Math.floor(time)),
    note: note.trim().slice(0, 200),
    createdAt: Date.now(),
  };
  writeAll([...readAll(), row]);
  return row;
}

export function removeBookmark(id: string) {
  writeAll(readAll().filter((b) => b.id !== id));
}

/** All bookmarks across every anime — for a future profile view. */
export function getAllBookmarks(): PlayerBookmark[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}
