import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEvent } from "expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getEpisodes, getStream, saveProgress } from "@/api/catalog";
import { useSession } from "@/api/session";
import type { EpisodeItem, KittyStream } from "@/api/types";
import { ErrorBlock, LoadingBlock } from "@/components/State";
import { useLoad } from "@/lib/load";
import { colors, space } from "@/theme";

const DEFAULT_PROVIDER = "AniDelta";

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ id: string; episode?: string; title?: string; t?: string }>();
  const animeId = String(params.id ?? "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const [episode, setEpisode] = useState(params.episode || "1");
  const [audio, setAudio] = useState<"sub" | "dub">("sub");
  const [resumeAt, setResumeAt] = useState(Number(params.t || 0) || 0);

  const episodes = useLoad(
    `watch-episodes:${session.apiBase}:${animeId}`,
    () => getEpisodes({ base: session.apiBase }, animeId),
    Boolean(animeId),
  );
  const stream = useLoad(
    `stream:${session.apiBase}:${animeId}:${episode}:${audio}`,
    () => getStream({ base: session.apiBase }, animeId, episode, audio),
    Boolean(animeId) && Boolean(episode),
  );

  const source = useMemo(() => toVideoSource(stream.data, session.apiBase), [session.apiBase, stream.data]);
  const player = useVideoPlayer(null, (instance) => {
    instance.timeUpdateEventInterval = 1;
  });
  const statusEvent = useEvent(player, "statusChange", { status: player.status });
  const timeEvent = useEvent(player, "timeUpdate", {
    currentTime: player.currentTime,
    currentLiveTimestamp: player.currentLiveTimestamp,
    currentOffsetFromLive: player.currentOffsetFromLive,
    bufferedPosition: player.bufferedPosition,
  });

  useEffect(() => {
    if (!source) {
      player.pause();
      return;
    }
    let cancelled = false;
    player
      .replaceAsync(source)
      .then(() => {
        if (cancelled) return;
        if (resumeAt > 1) player.currentTime = resumeAt;
        player.play();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [player, resumeAt, source]);

  useEffect(() => {
    if (!session.token || !animeId) return;
    const handle = setInterval(() => {
      const current = player.currentTime;
      const duration = player.duration;
      if (!Number.isFinite(current) || !Number.isFinite(duration) || duration <= 0 || current < 5) return;
      void saveProgress(
        { base: session.apiBase, token: session.token },
        {
          animeId,
          episodeId: `ep-${episode}`,
          currentTime: current,
          duration,
          language: audio,
          server: DEFAULT_PROVIDER,
          anilistId: Number(animeId),
          animeTitle: params.title,
          episodeNumber: Number(episode),
        },
      ).catch(() => undefined);
    }, 15_000);
    return () => clearInterval(handle);
  }, [animeId, audio, episode, params.title, player, session.apiBase, session.token]);

  const list = episodes.data?.data.episodes ?? [];
  const skip = skipLabel(stream.data, timeEvent?.currentTime ?? player.currentTime);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.title}>
          {params.title || "Watch"} · Episode {episode}
        </Text>
      </View>

      <View style={styles.stage}>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
        />
        {stream.loading ? (
          <View style={styles.overlay}>
            <LoadingBlock label="Opening the stream" />
          </View>
        ) : null}
      </View>

      {stream.error ? <ErrorBlock message={stream.error} onRetry={stream.reload} /> : null}
      {!stream.loading && stream.data && !stream.data.file ? (
        <ErrorBlock message={stream.data.error || "This episode did not return a playable file."} onRetry={stream.reload} />
      ) : null}
      {statusEvent.status === "error" && statusEvent.error?.message ? (
        <Text style={styles.error}>{statusEvent.error.message}</Text>
      ) : null}
      {stream.data?.audioFallback ? <Text style={styles.note}>Dub was unavailable, so this is the sub file.</Text> : null}

      <View style={styles.controls}>
        <Toggle
          label="Sub"
          selected={audio === "sub"}
          onPress={() => {
            setResumeAt(0);
            setAudio("sub");
          }}
        />
        <Toggle
          label="Dub"
          selected={audio === "dub"}
          onPress={() => {
            setResumeAt(0);
            setAudio("dub");
          }}
        />
        {skip ? (
          <Pressable
            style={styles.skip}
            onPress={() => {
              player.currentTime = skip.to;
            }}
          >
            <Text style={styles.skipText}>{skip.label}</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.episodes}>
        {list.map((item) => (
          <EpisodeChip
            key={item.episodeId}
            item={item}
            selected={String(item.number) === String(episode)}
            onPress={() => {
              setResumeAt(0);
              setEpisode(String(item.number));
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function toVideoSource(stream: KittyStream | undefined, apiBase: string): VideoSource | null {
  const file = stream?.file;
  if (!file) return null;
  const uri = /^https?:\/\//i.test(file) ? file : new URL(file, `${apiBase.replace(/\/+$/, "")}/`).toString();
  const headers = stringHeaders(stream?.headers);
  return {
    uri,
    contentType: contentTypeFor(uri),
    ...(headers ? { headers } : {}),
  };
}

function stringHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string" && value) next[key] = value;
  }
  return Object.keys(next).length ? next : undefined;
}

function contentTypeFor(uri: string): "auto" | "hls" | "dash" | "progressive" {
  const path = uri.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".m3u8") || path.includes("/hls")) return "hls";
  if (path.endsWith(".mpd")) return "dash";
  if (path.endsWith(".mp4") || path.endsWith(".webm") || path.endsWith(".mkv")) return "progressive";
  return "auto";
}

function skipLabel(stream: KittyStream | undefined, current: number): { label: string; to: number } | null {
  const intro = stream?.skipTimes?.intro;
  const outro = stream?.skipTimes?.outro;
  if (intro && current >= intro.start && current < intro.end - 0.5) {
    return { label: "Skip intro", to: intro.end };
  }
  if (outro && current >= outro.start && current < outro.end - 0.5) {
    return { label: "Skip credits", to: outro.end };
  }
  return null;
}

function Toggle({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, selected && styles.toggleOn]}>
      <Text style={[styles.toggleText, selected && styles.toggleTextOn]}>{label}</Text>
    </Pressable>
  );
}

function EpisodeChip({
  item,
  selected,
  onPress,
}: {
  item: EpisodeItem;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{item.number}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: space.screen, paddingVertical: 10 },
  back: { color: colors.accent, fontWeight: "700" },
  title: { color: colors.text, fontWeight: "700", flex: 1 },
  stage: { backgroundColor: "#000", aspectRatio: 16 / 9, width: "100%" },
  video: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" },
  error: { color: "#fecaca", paddingHorizontal: space.screen, paddingTop: 8 },
  note: { color: colors.muted, paddingHorizontal: space.screen, paddingTop: 8 },
  controls: { flexDirection: "row", gap: 8, padding: space.screen, alignItems: "center" },
  toggle: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card },
  toggleOn: { backgroundColor: colors.accent },
  toggleText: { color: colors.text, fontWeight: "700" },
  toggleTextOn: { color: colors.accentInk },
  skip: { marginLeft: "auto", backgroundColor: colors.text, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  skipText: { color: colors.bg, fontWeight: "800" },
  episodes: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: space.screen, paddingBottom: 28 },
  chip: {
    minWidth: 40,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontWeight: "700" },
  chipTextOn: { color: colors.accentInk },
});
