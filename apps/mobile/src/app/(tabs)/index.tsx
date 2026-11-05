import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getContinue, getHomeCritical } from "@/api/catalog";
import { useSession } from "@/api/session";
import type { ContinueItem, SpotlightAnime } from "@/api/types";
import { Poster } from "@/components/Poster";
import { Rail } from "@/components/AnimeCard";
import { ErrorBlock, LoadingBlock } from "@/components/State";
import { plainText, useLoad, withoutAdult } from "@/lib/load";
import { colors, space } from "@/theme";

export default function HomeScreen() {
  const router = useRouter();
  const { apiBase, token, showAdult, ready } = useSession();
  const home = useLoad(
    `home:${apiBase}:${showAdult}:${ready}`,
    async () => {
      const response = await getHomeCritical({ base: apiBase });
      return response.data;
    },
    ready,
  );
  const keepWatching = useLoad(
    `continue:${apiBase}:${token ?? ""}:${ready}`,
    async () => {
      if (!token) return [] as ContinueItem[];
      const response = await getContinue({ base: apiBase, token });
      return response.data ?? [];
    },
    ready && Boolean(token),
  );

  const data = home.data;
  const spotlight = withoutAdult(data?.spotlightAnimes, showAdult)[0] as SpotlightAnime | undefined;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>Anikitty</Text>
        {home.loading && !data ? <LoadingBlock label="Loading the catalog" /> : null}
        {home.error ? <ErrorBlock message={home.error} onRetry={home.reload} /> : null}
        {spotlight ? <Hero anime={spotlight} /> : null}
        {token && keepWatching.data?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue watching</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {keepWatching.data.map((item) => (
                <ContinueCard
                  key={`${item.animeId}-${item.episodeId}`}
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: "/watch/[id]",
                      params: {
                        id: String(item.animeId),
                        episode: String(item.episodeNumber ?? episodeNumberFromId(item.episodeId) ?? 1),
                        t: String(Math.floor(item.currentTime || 0)),
                        title: item.anime?.title?.english || item.anime?.title?.romaji || "Episode",
                      },
                    })
                  }
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
        <Rail title="Trending" items={withoutAdult(data?.trendingAnimes, showAdult)} />
        <Rail title="Latest episodes" items={withoutAdult(data?.latestEpisodeAnimes, showAdult)} />
        <Rail
          title={
            data?.currentSeasonMeta
              ? `${titleCase(data.currentSeasonMeta.season)} ${data.currentSeasonMeta.year}`
              : "This season"
          }
          items={withoutAdult(data?.currentSeasonAnimes, showAdult)}
        />
        <Rail title="Recently added" items={withoutAdult(data?.recentlyAddedAnimes, showAdult)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Hero({ anime }: { anime: SpotlightAnime }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/anime/[id]", params: { id: anime.id } })}
      style={styles.hero}
    >
      <Poster uri={anime.poster || anime.cover} style={styles.heroImage} />
      <View style={styles.heroCopy}>
        <Text style={styles.kicker}>Spotlight</Text>
        <Text style={styles.heroTitle}>{anime.name}</Text>
        {anime.description ? (
          <Text numberOfLines={3} style={styles.heroBody}>
            {plainText(anime.description)}
          </Text>
        ) : null}
        <Text style={styles.watch}>Open title</Text>
      </View>
    </Pressable>
  );
}

function ContinueCard({ item, onPress }: { item: ContinueItem; onPress: () => void }) {
  const title = item.anime?.title?.english || item.anime?.title?.romaji || "Continue";
  const progress = item.duration > 0 ? Math.min(item.currentTime / item.duration, 1) : 0;
  return (
    <Pressable onPress={onPress} style={styles.continue}>
      <Poster uri={item.anime?.cover_image?.large} style={styles.continuePoster} />
      <Text numberOfLines={2} style={styles.continueTitle}>
        {title}
      </Text>
      <Text style={styles.meta}>Episode {item.episodeNumber ?? episodeNumberFromId(item.episodeId) ?? "?"}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </Pressable>
  );
}

function episodeNumberFromId(episodeId: string): number | null {
  const match = /(\d+)/.exec(episodeId);
  return match ? Number(match[1]) : null;
}

function titleCase(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.screen, paddingBottom: 32 },
  brand: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: 16 },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 22,
  },
  heroImage: { width: "100%", height: 190 },
  heroCopy: { padding: 14, gap: 6 },
  kicker: { color: colors.accent, fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  heroTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  heroBody: { color: colors.muted, lineHeight: 20 },
  watch: { color: colors.accent, fontWeight: "700", marginTop: 4 },
  section: { marginBottom: 22 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 10 },
  row: { gap: 10 },
  continue: { width: 148 },
  continuePoster: { width: 148, height: 84, borderRadius: 10 },
  continueTitle: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 6 },
  meta: { color: colors.faint, fontSize: 11, marginTop: 2 },
  track: { height: 3, backgroundColor: colors.line, borderRadius: 99, marginTop: 6, overflow: "hidden" },
  fill: { height: 3, backgroundColor: colors.accent },
});
