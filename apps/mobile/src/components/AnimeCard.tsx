import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Poster } from "@/components/Poster";
import type { AnimeCardData } from "@/api/types";
import { colors } from "@/theme";

export function AnimeCard({ anime }: { anime: AnimeCardData }) {
  const router = useRouter();
  const episodes = anime.episodes?.sub ?? anime.episodes?.dub;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/anime/[id]", params: { id: anime.id } })}
      style={styles.card}
    >
      <Poster uri={anime.poster} style={styles.poster} />
      <Text numberOfLines={2} style={styles.title}>
        {anime.name}
      </Text>
      <Text numberOfLines={1} style={styles.meta}>
        {[anime.score ? `${anime.score}%` : null, episodes ? `${episodes} ep` : anime.type, anime.year]
          .filter(Boolean)
          .join(" · ")}
      </Text>
    </Pressable>
  );
}

export function Rail({ title, items }: { title: string; items: AnimeCardData[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.rail}>
      <Text style={styles.railTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((anime) => (
          <AnimeCard key={`${title}-${anime.id}`} anime={anime} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 112 },
  poster: { width: 112, height: 164, borderRadius: 10 },
  title: { color: colors.text, fontSize: 13, fontWeight: "600", marginTop: 6 },
  meta: { color: colors.faint, fontSize: 11, marginTop: 2 },
  rail: { marginBottom: 22 },
  railTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10 },
});
