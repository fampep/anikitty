const BFF = "/api/account";

import { IAuth } from "@/store/auth-store";
import { withAuth } from "@/lib/auth/auth-fetch";

// ── Token management ────────────────────────────────────────────────
export function getAnisurgeToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("anisurgeToken");
}
/** Legacy no-op: sessions use HttpOnly cookies; clears old localStorage tokens. */
export function setAnisurgeToken() {
  localStorage.removeItem("anisurgeToken");
}
export function clearAnisurgeToken() {
  localStorage.removeItem("anisurgeToken");
}

export function authFromMeResponse(data: Record<string, unknown>): IAuth {
  const user = (data.user ?? data) as Record<string, unknown>;
  return {
    id: String(data.anisurgeUserId ?? user.id ?? ""),
    username: String(user.username ?? ""),
    email: String(user.email ?? ""),
    avatar: String(user.customPfpUrl ?? user.avatarUrl ?? ""),
    bannerUrl: (user.bannerUrl as string | null) ?? null,
    bio: (user.bio as string | null) ?? null,
    themeColor: (user.themeColor as string | null) ?? null,
    role: (user.role as string | null) ?? "user",
    permissions: Array.isArray(data.permissions)
      ? (data.permissions as string[])
      : [],
    supporterUntil:
      typeof data.supporterUntil === "string"
        ? data.supporterUntil
        : typeof user.supporterUntil === "string"
          ? user.supporterUntil
          : null,
    kittycoinBalance:
      typeof data.kittycoinBalance === "number"
        ? data.kittycoinBalance
        : typeof user.kittycoinBalance === "number"
          ? user.kittycoinBalance
          : 0,
    equippedFrame: (user.equippedFrame as string | null) ?? null,
    equippedSticker: (user.equippedSticker as string | null) ?? null,
    equippedIcon: (user.equippedIcon as string | null) ?? null,
  };
}

// ── Fetch wrapper ────────────────────────────────────────────────────
async function bff<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(
    `${BFF}${path}`,
    withAuth({
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string>),
      },
    }),
  );
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
  login: (identifier: string, password: string) =>
    bff("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }),

  /** @deprecated Use login() — kept for compatibility */
  loginWithAnisurge: (identifier: string, password: string) =>
    bff("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }),

  verify2fa: (pendingToken: string, code: string) =>
    bff("/auth/2fa-verify", { method: "POST", body: JSON.stringify({ pendingToken, code }) }),

  get2faStatus: () => bff<{ enabled: boolean; pendingSetup: boolean }>("/2fa"),

  setup2fa: () => bff<{ secret: string; otpauthUrl: string; qrDataUrl: string }>("/2fa/setup", { method: "POST" }),

  enable2fa: (code: string) =>
    bff("/2fa/enable", { method: "POST", body: JSON.stringify({ code }) }),

  disable2fa: (code: string) =>
    bff("/2fa/disable", { method: "POST", body: JSON.stringify({ code }) }),

  listPasskeys: () =>
    bff<{
      passkeys: {
        id: string;
        deviceName: string;
        deviceType: string | null;
        backedUp: boolean;
        lastUsedAt: string | null;
        createdAt: string | null;
      }[];
    }>("/passkeys"),

  passkeyRegisterOptions: (deviceName: string) =>
    bff("/passkeys/register/options", { method: "POST", body: JSON.stringify({ deviceName }) }),

  passkeyRegisterVerify: (pendingToken: string, response: unknown) =>
    bff("/passkeys/register/verify", {
      method: "POST",
      body: JSON.stringify({ pendingToken, response }),
    }),

  deletePasskey: (id: string) =>
    bff(`/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" }),

  passkeyLoginOptions: () =>
    bff("/auth/passkey/options", { method: "POST", body: "{}" }),

  passkeyLoginVerify: (pendingToken: string, response: unknown) =>
    bff("/auth/passkey/verify", {
      method: "POST",
      body: JSON.stringify({ pendingToken, response }),
    }),

  getSessions: () =>
    bff<{
      sessions: {
        id: string;
        deviceLabel: string;
        ipAddress: string | null;
        lastActiveAt: string | null;
        createdAt: string | null;
        current: boolean;
      }[];
    }>("/sessions"),

  revokeSessions: (sessionIds: string[]) =>
    bff<{ ok: boolean; revoked: string[]; currentRevoked: boolean }>("/sessions", {
      method: "DELETE",
      body: JSON.stringify({ sessionIds }),
    }),

  revokeOtherSessions: () =>
    bff<{ ok: boolean; revoked: string[]; currentRevoked: boolean }>("/sessions", {
      method: "DELETE",
      body: JSON.stringify({ allOthers: true }),
    }),

  signup: (username: string, email: string, password: string) =>
    bff("/auth/signup", { method: "POST", body: JSON.stringify({ username, email, password }) }),

  /** @deprecated Use signup() — kept for compatibility */
  signupWithAnisurge: (username: string, email: string, password: string) =>
    bff("/auth/signup", { method: "POST", body: JSON.stringify({ username, email, password }) }),

  logout: () =>
    bff("/auth/logout", { method: "POST" }).catch(() => {}),

  me: () => bff("/me"),

  updateProfile: (data: {
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    bio?: string | null;
    themeColor?: string | null;
  }) => bff("/me", { method: "PUT", body: JSON.stringify(data) }),
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

// ── AniList sync ─────────────────────────────────────────────────────
export const anilistSync = {
  importWatchlist: (override = false) =>
    fetch("/api/anilist/sync", withAuth({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override }),
    })).then(async (res) => {
      const body = await res.json();
      if (!res.ok) {
        const err = new Error(body?.error ?? res.statusText) as Error & { status?: number };
        (err as any).status = res.status;
        throw err;
      }
      return body as { imported: number; removed: number; skipped: number; override: boolean };
    }),
};

// ── Progress ─────────────────────────────────────────────────────────
export const anisurgeProgress = {
  save: (body: {
    animeId: string;
    anilistId?: number;
    malId?: number;
    episodeId: string;
    episodeNumber?: number;
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
