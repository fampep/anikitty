const BFF = "/api/account";

// ── Token management ────────────────────────────────────────────────
export function getAnisurgeToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("anisurgeToken");
}
export function setAnisurgeToken(token: string) {
  localStorage.setItem("anisurgeToken", token);
}
export function clearAnisurgeToken() {
  localStorage.removeItem("anisurgeToken");
}

// ── Fetch wrapper ────────────────────────────────────────────────────
async function bff<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAnisurgeToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BFF}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body?.error ?? res.statusText) as any;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return res.json();
}

// ── Folder mapping ───────────────────────────────────────────────────
const STATUS_TO_FOLDER: Record<string, string> = {
  "watching":      "WATCHING",
  "plan to watch": "PLANNING",
  "completed":     "COMPLETED",
  "on hold":       "PAUSED",
  "dropped":       "DROPPED",
};

const FOLDER_TO_STATUS: Record<string, string> = {
  WATCHING:  "watching",
  PLANNING:  "plan to watch",
  COMPLETED: "completed",
  PAUSED:    "on hold",
  DROPPED:   "dropped",
};

export function statusToFolder(status: string): string {
  return STATUS_TO_FOLDER[status.toLowerCase()] ?? "WATCHING";
}
export function folderToStatus(folder: string): string {
  return FOLDER_TO_STATUS[folder.toUpperCase()] ?? "watching";
}

// ── Auth ─────────────────────────────────────────────────────────────
export const anisurgeAuth = {
  loginWithAnisurge: (identifier: string, password: string) =>
    bff("/auth/anisurge-login", { method: "POST", body: JSON.stringify({ identifier, password }) }),

  signupWithAnisurge: (username: string, email: string, password: string) =>
    bff("/auth/anisurge-signup", { method: "POST", body: JSON.stringify({ username, email, password }) }),

  logout: () =>
    bff("/auth/logout", { method: "POST" }).catch(() => {}),

  me: () => bff("/me"),

  updateProfile: (data: { avatarUrl?: string | null; bannerUrl?: string | null; bio?: string | null }) =>
    bff("/me", { method: "PUT", body: JSON.stringify(data) }),
};

// ── Watchlist ────────────────────────────────────────────────────────
export const anisurgeWatchlist = {
  get: (folder?: string, limit = 20, offset = 0) =>
    bff(`/watchlist?${folder ? `folder=${encodeURIComponent(folder)}&` : ""}limit=${limit}&offset=${offset}`),

  add: (body: {
    animeId: string;
    folder: string;
    anilistId?: number;
    malId?: number;
    animeTitle?: string;
    animeThumbnail?: string;
  }) => bff("/watchlist", { method: "POST", body: JSON.stringify(body) }),

  remove: (animeId: string) =>
    bff(`/watchlist/${encodeURIComponent(animeId)}`, { method: "DELETE" }),
};

// ── Progress ─────────────────────────────────────────────────────────
export const anisurgeProgress = {
  save: (body: {
    animeId: string;
    anilistId?: number;
    malId?: number;
    episodeId: string;
    currentTime: number;
    duration: number;
    language?: "sub" | "dub";
    server?: string;
    animeTitle?: string;
    animeThumbnail?: string;
  }) => bff("/watch/progress", { method: "POST", body: JSON.stringify(body) }),
};

// ── Continue watching ────────────────────────────────────────────────
export const anisurgeContinue = {
  get: (latestPerAnime = false, limit = 50, offset = 0) =>
    bff(
      `/watch/continue?${latestPerAnime ? "latestPerAnime=true&" : ""}limit=${limit}&offset=${offset}`,
    ),

  getByAnime: (animeId: string, limit = 500) =>
    bff(`/watch/continue?animeId=${encodeURIComponent(animeId)}&limit=${limit}`),

  getEpisode: (animeId: string, episodeId: string) =>
    bff(`/watch/continue/${encodeURIComponent(animeId)}/${encodeURIComponent(episodeId)}`),

  remove: (animeId: string, episodeId: string) =>
    bff(`/watch/continue/${encodeURIComponent(animeId)}/${encodeURIComponent(episodeId)}`, {
      method: "DELETE",
    }),
};
