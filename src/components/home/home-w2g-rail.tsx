"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Users } from "lucide-react";
import Container from "@/components/layout/container";
import { SectionHeading } from "@/components/home/section-heading";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";
import { w2gApi, w2gWatchUrl, type W2gRoomListItem } from "@/lib/social/w2g";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";

export default function HomeW2gRail() {
  const t = useT();
  const router = useRouter();
  const auth = useAuthStore((s) => s.auth);
  const [rooms, setRooms] = useState<W2gRoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await w2gApi.listRooms();
      setRooms(data.rooms.slice(0, 4));
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (!loading && rooms.length === 0) return null;

  const handleJoin = async (room: W2gRoomListItem) => {
    if (!auth) {
      router.push(ROUTES.WATCH_TOGETHER);
      return;
    }
    setJoining(room.code);
    try {
      const data = await w2gApi.joinRoom(room.code);
      router.push(w2gWatchUrl(data.room));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("w2gPage.joinFailed"));
      setJoining(null);
    }
  };

  return (
    <Container className="pt-2 pb-6 sm:pb-8">
      <div className="site-panel p-3 sm:p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <SectionHeading
            icon={<Users className="w-4 h-4" />}
            title={t("home.w2gRail.title")}
            href={ROUTES.WATCH_TOGETHER}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground dark:text-white/30" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => void handleJoin(room)}
                disabled={joining === room.code}
                className="group flex items-center gap-3 rounded-xl border border-border dark:border-white/[0.08] bg-muted/20 dark:bg-white/[0.02] p-2.5 text-left hover:border-violet-400/25 hover:bg-violet-500/[0.06] transition-all disabled:opacity-50"
              >
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted/50 dark:bg-white/[0.04]">
                  {room.animeThumbnail ? (
                    <Image src={room.animeThumbnail} alt="" fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground dark:text-white truncate">
                    {room.name ?? room.animeTitle ?? t("w2gPage.unnamedRoom")}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 truncate mt-0.5">
                    {room.hostUsername} · {t("w2gPage.memberCount", { count: room.memberCount })}
                  </p>
                </div>
                {joining === room.code ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-300" />
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-violet-300 transition-colors" />
                )}
              </button>
            ))}
          </div>
        )}

        <Link
          href={ROUTES.WATCH_TOGETHER}
          className="text-[11px] font-semibold text-violet-300/80 hover:text-violet-200 self-start"
        >
          {t("home.w2gRail.viewAll")} →
        </Link>
      </div>
    </Container>
  );
}
