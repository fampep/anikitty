"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { w2gApi, type W2gMessage, type W2gMember, type W2gRoom } from "@/lib/social/w2g";
import { useIntervalWhenVisible } from "@/hooks/use-interval-when-visible";

const POLL_MS = 2_000;

export type W2gSyncState = {
  version: number;
  isPlaying: boolean;
  currentTime: number;
};

type UseW2gOptions = {
  code: string | null;
  animeId: string | null;
  episodeId: string | null;
  provider: string;
  audio: "sub" | "dub";
  enabled: boolean;
  onEpisodeChange?: (episodeId: string, episodeNumber: number) => void;
};

export function useW2g({
  code,
  episodeId,
  provider,
  audio,
  enabled,
  onEpisodeChange,
}: UseW2gOptions) {
  const [room, setRoom] = useState<W2gRoom | null>(null);
  const [members, setMembers] = useState<W2gMember[]>([]);
  const [messages, setMessages] = useState<W2gMessage[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<W2gSyncState | null>(null);

  const lastVersionRef = useRef(0);
  const syncThrottleRef = useRef(0);
  const onEpisodeChangeRef = useRef(onEpisodeChange);
  useEffect(() => {
    onEpisodeChangeRef.current = onEpisodeChange;
  }, [onEpisodeChange]);

  const applyPayload = useCallback((data: Awaited<ReturnType<typeof w2gApi.getRoom>>) => {
    setRoom(data.room);
    setMembers(data.members);
    setIsHost(data.isHost);
    setIsMember(data.isMember);

    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const added = data.messages.filter((m) => !seen.has(m.id));
      return added.length ? [...prev, ...added] : prev.length ? prev : data.messages;
    });

    if (data.room.stateVersion !== lastVersionRef.current) {
      lastVersionRef.current = data.room.stateVersion;
      setSyncState({
        version: data.room.stateVersion,
        isPlaying: data.room.isPlaying,
        currentTime: data.room.currentTime,
      });
    }

    if (
      data.room.episodeId &&
      episodeId &&
      data.room.episodeId !== episodeId &&
      !data.isHost
    ) {
      onEpisodeChangeRef.current?.(data.room.episodeId, data.room.episodeNumber);
    }
  }, [episodeId]);

  const refresh = useCallback(async () => {
    if (!code || !enabled) return;
    try {
      const data = isMember
        ? await w2gApi.getRoom(code)
        : await w2gApi.joinRoom(code).catch(async () => w2gApi.getRoom(code));
      applyPayload(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Room error");
    }
  }, [code, enabled, isMember, applyPayload]);

  const join = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    try {
      const data = await w2gApi.joinRoom(code);
      applyPayload(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to join");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [code, applyPayload]);

  useEffect(() => {
    if (!code || !enabled) return;
    setLoading(true);
    w2gApi
      .getRoom(code)
      .then((data) => {
        applyPayload(data);
        if (!data.isMember) return w2gApi.joinRoom(code);
        return data;
      })
      .then((data) => {
        if (data) applyPayload(data);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load room");
      })
      .finally(() => setLoading(false));
  }, [code, enabled, applyPayload]);

  useIntervalWhenVisible(refresh, POLL_MS, Boolean(code && enabled && isMember));

  const pushSync = useCallback(
    async (state: {
      isPlaying: boolean;
      currentTime: number;
      episodeId?: string;
      episodeNumber?: number;
    }) => {
      if (!code || !isHost) return;
      const now = Date.now();
      if (now - syncThrottleRef.current < 400) return;
      syncThrottleRef.current = now;
      try {
        const { room: updated } = await w2gApi.syncPlayback(code, {
          ...state,
          provider,
          audio,
          episodeId: state.episodeId ?? episodeId ?? undefined,
          episodeNumber: state.episodeNumber,
        });
        setRoom(updated);
        lastVersionRef.current = updated.stateVersion;
        setSyncState({
          version: updated.stateVersion,
          isPlaying: updated.isPlaying,
          currentTime: updated.currentTime,
        });
      } catch {
        // silent
      }
    },
    [code, isHost, provider, audio, episodeId],
  );

  const onPlaybackSync = useCallback(
    (state: { isPlaying: boolean; currentTime: number }) => {
      pushSync(state);
    },
    [pushSync],
  );

  const syncEpisode = useCallback(
    (epId: string, epNum: number, currentTime: number, isPlaying: boolean) => {
      pushSync({ isPlaying, currentTime, episodeId: epId, episodeNumber: epNum });
    },
    [pushSync],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      if (!code) return;
      const msg = await w2gApi.sendMessage(code, body);
      setMessages((prev) => [...prev, msg]);
    },
    [code],
  );

  const leave = useCallback(async () => {
    if (!code) return;
    await w2gApi.leaveRoom(code);
    setRoom(null);
    setIsMember(false);
    setIsHost(false);
  }, [code]);

  const createRoom = useCallback(
    async (opts: {
      animeId: string;
      animeTitle?: string;
      animeThumbnail?: string;
      episodeId: string;
      episodeNumber?: number;
      currentTime?: number;
    }) => {
      const { room: created } = await w2gApi.createRoom({
        ...opts,
        provider,
        audio,
      });
      setRoom(created);
      setIsHost(true);
      setIsMember(true);
      return created;
    },
    [provider, audio],
  );

  return {
    room,
    members,
    messages,
    isHost,
    isMember,
    loading,
    error,
    syncState,
    join,
    leave,
    refresh,
    createRoom,
    sendMessage,
    onPlaybackSync,
    syncEpisode,
  };
}
