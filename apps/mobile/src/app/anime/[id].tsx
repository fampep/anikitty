import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addToWatchlist, getAnime, getEpisodes, getRelated } from "@/api/catalog";
import { useSession } from "@/api/session";
import { Poster } from "@/components/Poster";
import { Rail } from "@/components/AnimeCard";
import { ErrorBlock, LoadingBlock } from "@/components/State";
import { plainText, useLoad, withoutAdult } from "@/lib/load";
import { colors, space } from "@/theme";

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const animeId = String(id ?? "");
  const router = useRouter();
  const session = useSession();
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const detail = useLoad(
    `anime:${session.apiBase}:${animeId}`,
    () => getAnime({ base: session.apiBase }, animeId),
    Boolean(animeId),
  );
  const episodes = useLoad(
    `episodes:${session.apiBase}:${animeId}`,
    () => getEpisodes({ base: session.apiBase }, animeId),
    Boolean(animeId),
  );
  const related = useLoad(
    `related:${session.apiBase}:${animeId}`,
    () => getRelated({ base: session.apiBase }, animeId),
    Boolean(animeId),
  );

  const info = detail.data?.data.anime.info;
  const more = detail.data?.data.anime.moreInfo;
  const episodeItems = episodes.data?.data.episodes ?? [];

  async function save(folder: "WATCHING" | "PLANNING") {
    if (!session.token || !info) {
      setNotice("Sign in on the Profile tab to save a title.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await addToWatchlist(
        { base: session.apiBase, token: session.token },
        {
          animeId: info.id,
          folder,
          anilistId: info.anilistId ?? Number(info.id),
          animeTitle: info.name,
          animeThumbnail: info.poster,
        },
      );
      setNotice(folder === "WATCHING" ? "Added to Watching." : "Added to Planning.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update the list");
    } finally {
      setSaving(false);
    }
  }

  if (!animeId) return <ErrorBlock message="Missing anime id." />;
  if (detail.loading && !info) return <LoadingBlock label="Loading title" />;
  if (detail.error || !info) return <ErrorBlock message={detail.error ?? "Title not found"} onRetry={detail.reload} />;

  const description = plainText(info.description);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Poster uri={info.banner || info.poster} style={styles.banner} />
      <View style={styles.heading}>
        <Poster uri={info.poster} style={styles.poster} />
        <View style={styles.copy}>
          <Text style={styles.name}>{info.name}</Text>
          <Text style={styles.meta}>
            {[
              info.stats?.rating && info.stats.rating !== "N/A" ? info.stats.rating : null,
              info.stats?.type,
              more?.status,
              info.stats?.episodes?.sub ? `${info.stats.episodes.sub} episodes` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {more?.studios ? <Text style={styles.meta}>{more.studios}</Text> : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.primary}
          onPress={() =>
            router.push({
              pathname: "/watch/[id]",
              params: { id: animeId, episode: "1", title: info.name },
            })
          }
        >
          <Text style={styles.primaryText}>Play</Text>
        </Pressable>
        <Pressable style={styles.secondary} disabled={saving} onPress={() => void save("WATCHING")}>
          <Text style={styles.secondaryText}>Watching</Text>
        </Pressable>
        <Pressable style={styles.secondary} disabled={saving} onPress={() => void save("PLANNING")}>
          <Text style={styles.secondaryText}>Plan</Text>
        </Pressable>
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {more?.genres?.length ? (
        <View style={styles.genres}>
          {more.genres.map((genre) => (
            <Text key={genre} style={styles.genre}>
              {genre}
            </Text>
          ))}
        </View>
      ) : null}

      {description ? <Text style={styles.body}>{description}</Text> : null}

      <Text style={styles.section}>Episodes</Text>
      {episodes.loading && !episodeItems.length ? <LoadingBlock /> : null}
      {episodes.error ? <Text style={styles.meta}>{episodes.error}</Text> : null}
      {episodeItems.map((episode) => (
        <Pressable
          key={episode.episodeId}
          style={styles.episode}
          onPress={() =>
            router.push({
              pathname: "/watch/[id]",
              params: {
                id: animeId,
                episode: String(episode.number),
                title: info.name,
              },
            })
          }
        >
          <Text style={styles.episodeNo}>{episode.number}</Text>
          <View style={styles.episodeCopy}>
            <Text style={styles.episodeTitle}>{episode.title}</Text>
            {episode.overview ? (
              <Text numberOfLines={2} style={styles.meta}>
                {plainText(episode.overview)}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}

      <View style={styles.related}>
        <Rail
          title="Related"
          items={withoutAdult(related.data?.data.relatedAnimes, session.showAdult).map((item) => ({
            id: item.id,
            name: item.name,
            poster: item.poster,
            type: item.relationType || item.type,
            isAdult: item.isAdult,
          }))}
        />
        <Rail
          title="Recommended"
          items={withoutAdult(related.data?.data.recommendedAnimes, session.showAdult).map((item) => ({
            id: item.id,
            name: item.name,
            poster: item.poster,
            isAdult: item.isAdult,
          }))}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, backgroundColor: colors.bg },
  banner: { width: "100%", height: 180 },
  heading: { flexDirection: "row", gap: 12, padding: space.screen },
  poster: { width: 96, height: 140, borderRadius: 10, marginTop: -48 },
  copy: { flex: 1, gap: 4, justifyContent: "flex-end" },
  name: { color: colors.text, fontSize: 22, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 13 },
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: space.screen },
  primary: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  primaryText: { color: colors.accentInk, fontWeight: "800" },
  secondary: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryText: { color: colors.text, fontWeight: "700" },
  notice: { color: colors.text, paddingHorizontal: space.screen, marginTop: 10 },
  genres: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: space.screen, marginTop: 14 },
  genre: {
    color: colors.text,
    backgroundColor: colors.card,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
  },
  body: { color: colors.muted, lineHeight: 22, padding: space.screen },
  section: { color: colors.text, fontSize: 18, fontWeight: "800", paddingHorizontal: space.screen, marginBottom: 8 },
  episode: { flexDirection: "row", gap: 12, paddingHorizontal: space.screen, paddingVertical: 10 },
  episodeNo: { color: colors.accent, fontWeight: "800", width: 28, fontSize: 16 },
  episodeCopy: { flex: 1, gap: 2 },
  episodeTitle: { color: colors.text, fontWeight: "600" },
  related: { paddingHorizontal: space.screen, marginTop: 12 },
});
