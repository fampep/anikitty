import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { searchAnime } from "@/api/catalog";
import { useSession } from "@/api/session";
import type { AnimeCardData } from "@/api/types";
import { Poster } from "@/components/Poster";
import { ErrorBlock, LoadingBlock } from "@/components/State";
import { withoutAdult } from "@/lib/load";
import { colors, space } from "@/theme";

export default function SearchScreen() {
  const router = useRouter();
  const { apiBase, showAdult, ready } = useSession();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AnimeCardData[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSubmitted(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!ready || submitted.length < 2) {
      setItems([]);
      setHasNext(false);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchAnime({ base: apiBase }, submitted, page)
      .then((response) => {
        if (cancelled) return;
        const next = withoutAdult(response.data.animes, showAdult);
        setItems((current) => (page === 1 ? next : [...current, ...next]));
        setHasNext(response.data.hasNextPage);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Search failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, page, ready, showAdult, submitted]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Search</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Titles, studios, characters"
        placeholderTextColor={colors.faint}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {submitted.length < 2 ? <Text style={styles.hint}>Type at least two characters.</Text> : null}
      {error ? <ErrorBlock message={error} /> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (hasNext && !loading) setPage((value) => value + 1);
        }}
        ListFooterComponent={loading ? <LoadingBlock /> : undefined}
        ListEmptyComponent={!loading && submitted.length >= 2 && !error ? <Text style={styles.hint}>No matches.</Text> : undefined}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: "/anime/[id]", params: { id: item.id } })}
          >
            <Poster uri={item.poster} style={styles.poster} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {[item.type, item.year, item.score ? `${item.score}%` : null, item.status].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.screen },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: 12 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { color: colors.muted, marginTop: 16 },
  list: { paddingTop: 16, paddingBottom: 24, gap: 12 },
  row: { flexDirection: "row", gap: 12 },
  poster: { width: 64, height: 92, borderRadius: 8 },
  copy: { flex: 1, justifyContent: "center", gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 13 },
});
