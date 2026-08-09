"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Tv,
  ArrowRight,
  Loader2,
  LogIn,
  RefreshCw,
  Trash2,
  Crown,
  Play,
  Plus,
} from "lucide-react";
import Container from "@/components/layout/container";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";
import { w2gApi, w2gWatchUrl, type W2gRoomListItem } from "@/lib/social/w2g";
import { normalizeW2gCode } from "@/lib/social/w2g-code";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

function RoomCard({
  room,
  joining,
  onJoin,
  onDelete,
  isHost,
}: {
  room: W2gRoomListItem;
  joining: boolean;
  onJoin: () => void;
  onDelete?: () => void;
  isHost: boolean;
}) {
  const t = useT();
  const label = room.name ?? room.animeTitle ?? t("w2gPage.unnamedRoom");
  const epLabel =
    room.episodeNumber > 0
      ? t("watch.episodeShort", { n: room.episodeNumber })
      : null;

  return (
    <article className="site-panel flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10">
          {room.animeThumbnail ? (
            <Image
              src={room.animeThumbnail}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Tv className="h-5 w-5 text-muted-foreground/40 dark:text-white/20" />
            </div>
          )}
          {room.isPlaying && (
            <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold uppercase bg-emerald-500/90 text-white">
              <Play className="h-2 w-2 fill-current" />
              Live
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground dark:text-white truncate">{label}</p>
          <p className="text-[11px] text-muted-foreground dark:text-white/40 font-mono truncate mt-0.5">
            {room.animeTitle ?? room.animeId}
            {epLabel ? ` · ${epLabel}` : ""}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground dark:text-white/45">
              <Crown className="h-3 w-3 text-amber-400/80" />
              {room.hostUsername}
            </span>
            <span className="text-muted-foreground/30 dark:text-white/15">·</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground dark:text-white/45">
              <Users className="h-3 w-3" />
              {t("w2gPage.memberCount", { count: room.memberCount })}
            </span>
            <span className="text-muted-foreground/30 dark:text-white/15">·</span>
            <span className="text-[10px] font-mono uppercase text-zinc-300/70">{room.audio}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        {isHost && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl text-[11px] font-semibold border border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("w2gPage.deleteRoom")}
          </button>
        )}
        <button
          type="button"
          onClick={onJoin}
          disabled={joining}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-none h-9 px-4 rounded-xl text-[11px] font-bold transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40",
          )}
        >
          {joining ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
          {t("w2gPage.joinRoom")}
        </button>
      </div>
    </article>
  );
}

export default function WatchTogetherContent() {
  const router = useRouter();
  const params = useSearchParams();
  const joinCode = params.get("join");
  const { auth } = useAuthStore();
  const t = useT();
  const [rooms, setRooms] = useState<W2gRoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [, setDeletingCode] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      const data = await w2gApi.listRooms();
      setRooms(data.rooms);
    } catch {
      toast.error(t("w2gPage.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadRooms();
    const id = window.setInterval(() => void loadRooms(), 15_000);
    return () => window.clearInterval(id);
  }, [loadRooms]);

  useEffect(() => {
    if (!joinCode || !auth) return;
    const normalized = normalizeW2gCode(joinCode);
    if (!normalized) return;
    setJoiningCode(normalized);
    w2gApi
      .joinRoom(normalized)
      .then((data) => {
        toast.success(t("w2gPage.joinedRoom", { name: data.room.name ?? data.room.code }));
        router.replace(w2gWatchUrl(data.room));
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : t("w2gPage.joinFailed"));
        setJoiningCode(null);
      });
  }, [joinCode, auth, router, t]);

  const handleJoin = async (room: W2gRoomListItem) => {
    if (!auth) {
      toast.error(t("w2gPage.signInToJoin"));
      return;
    }
    setJoiningCode(room.code);
    try {
      const data = await w2gApi.joinRoom(room.code);
      toast.success(t("w2gPage.joinedRoom", { name: data.room.name ?? room.animeTitle ?? room.code }));
      router.push(w2gWatchUrl(data.room));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("w2gPage.joinFailed"));
      setJoiningCode(null);
    }
  };

  const handleDelete = async (room: W2gRoomListItem) => {
    if (!confirm(t("w2gPage.deleteConfirm"))) return;
    setDeletingCode(room.code);
    try {
      await w2gApi.deleteRoom(room.code);
      toast.success(t("w2gPage.deletedRoom"));
      setRooms((prev) => prev.filter((r) => r.code !== room.code));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("w2gPage.deleteFailed"));
    } finally {
      setDeletingCode(null);
    }
  };

  return (
    <div className="min-h-screen pt-page pb-24">
      <Container className="max-w-2xl">
        <div className="flex flex-col gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 border border-primary/25 mb-4">
              <Users className="h-7 w-7 text-zinc-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground dark:text-white mb-2">
              {t("w2gPage.title")}
            </h1>
            <p className="text-sm text-muted-foreground dark:text-white/40 font-mono max-w-md mx-auto">
              {t("w2gPage.subtitle")}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground dark:text-white/85">
              {t("w2gPage.openRooms")}
            </h2>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadRooms();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-border dark:border-white/10 text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/75 transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {t("w2gPage.refresh")}
            </button>
          </div>

          {!auth && (
            <div className="site-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground dark:text-white/50">{t("w2gPage.signInHint")}</p>
              <LoginPopoverButton
                customTrigger={
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    {t("w2gPage.signIn")}
                  </button>
                }
              />
            </div>
          )}

          {loading && rooms.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-white/30" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="site-panel p-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 dark:text-white/20 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground dark:text-white/60">{t("w2gPage.noRooms")}</p>
              <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono mt-2 max-w-sm mx-auto">
                {t("w2gPage.noRoomsHint")}
              </p>
              <Link
                href={ROUTES.HOME}
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-zinc-300 hover:text-zinc-200"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("w2gPage.browseToCreate")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  joining={joiningCode === room.code}
                  isHost={auth?.id === room.hostUserId}
                  onJoin={() => void handleJoin(room)}
                  onDelete={
                    auth?.id === room.hostUserId
                      ? () => void handleDelete(room)
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          <div className="site-panel p-5">
            <h3 className="text-xs font-bold text-muted-foreground dark:text-white/60 mb-3 flex items-center gap-2">
              <Tv className="h-3.5 w-3.5" />
              {t("w2gPage.howItWorks")}
            </h3>
            <ol className="text-[12px] text-muted-foreground dark:text-white/40 font-mono space-y-2 list-decimal list-inside leading-relaxed">
              <li>{t("w2gPage.step1")}</li>
              <li>{t("w2gPage.step2")}</li>
              <li>{t("w2gPage.step3")}</li>
              <li>{t("w2gPage.step4")}</li>
            </ol>
          </div>
        </div>
      </Container>
    </div>
  );
}
