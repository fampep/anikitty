import { withAuth } from "@/lib/auth/auth-fetch";

const BASE = "/api/w2g";

async function w2gFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(
    `${BASE}${path}`,
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
    const err = new Error(body?.error ?? res.statusText) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export type W2gRoom = {
  id: string;
  code: string;
  hostUserId: string;
  animeId: string;
  animeTitle: string | null;
  animeThumbnail: string | null;
  episodeId: string;
  episodeNumber: number;
  provider: string;
  audio: "sub" | "dub";
  isPlaying: boolean;
  currentTime: number;
  stateVersion: number;
  updatedAt: string | null;
  createdAt: string | null;
};

export type W2gMember = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  isHost: boolean;
  isOnline: boolean;
  joinedAt: string | null;
};

export type W2gMessage = {
  id: string;
  body: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type W2gRoomPayload = {
  room: W2gRoom;
  members: W2gMember[];
  messages: W2gMessage[];
  isHost: boolean;
  isMember: boolean;
};

export const w2gApi = {
  createRoom: (body: {
    animeId: string;
    animeTitle?: string;
    animeThumbnail?: string;
    episodeId: string;
    episodeNumber?: number;
    provider?: string;
    audio?: "sub" | "dub";
    currentTime?: number;
  }) => w2gFetch<{ room: W2gRoom; isHost: boolean; isMember: boolean }>("/rooms", {
    method: "POST",
    body: JSON.stringify(body),
  }),

  getRoom: (code: string) => w2gFetch<W2gRoomPayload>(`/rooms/${code}`),

  joinRoom: (code: string) =>
    w2gFetch<W2gRoomPayload>(`/rooms/${code}/join`, { method: "POST" }),

  leaveRoom: (code: string) =>
    w2gFetch<{ ok: boolean; closed?: boolean }>(`/rooms/${code}`, { method: "DELETE" }),

  syncPlayback: (
    code: string,
    body: {
      isPlaying: boolean;
      currentTime: number;
      episodeId?: string;
      episodeNumber?: number;
      provider?: string;
      audio?: "sub" | "dub";
    },
  ) => w2gFetch<{ room: W2gRoom }>(`/rooms/${code}/sync`, {
    method: "POST",
    body: JSON.stringify(body),
  }),

  sendMessage: (code: string, body: string) =>
    w2gFetch<W2gMessage>(`/rooms/${code}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
};

export function w2gWatchUrl(room: W2gRoom): string {
  return `/anime/watch?anime=${encodeURIComponent(room.animeId)}&episode=${encodeURIComponent(room.episodeId)}&w2g=${room.code}`;
}

export function w2gInviteUrl(code: string): string {
  if (typeof window === "undefined") return `/watch-together?join=${code}`;
  return `${window.location.origin}/watch-together?join=${code}`;
}

export function formatW2gTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
