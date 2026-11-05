import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getPublicProfile, getWatchlist } from "@/api/catalog";
import { useSession } from "@/api/session";
import { Poster } from "@/components/Poster";
import { ErrorBlock, LoadingBlock } from "@/components/State";
import { plainText, useLoad } from "@/lib/load";
import { colors, space } from "@/theme";

const COUNT_LABELS: Record<string, string> = {
  watching: "Watching",
  completed: "Completed",
  plan: "Planning",
  planning: "Planning",
  onHold: "On hold",
  paused: "Paused",
  dropped: "Dropped",
};

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const name = String(username ?? "");
  const session = useSession();
  const profile = useLoad(
    `profile:${session.apiBase}:${session.token ?? ""}:${name}`,
    () => getPublicProfile({ base: session.apiBase, token: session.token }, name),
    Boolean(name),
  );
  const mine = session.me?.user.username?.toLowerCase() === name.toLowerCase();
  const watchlist = useLoad(
    `watchlist:${session.apiBase}:${session.token ?? ""}:${mine}`,
    () => getWatchlist({ base: session.apiBase, token: session.token }),
    mine && Boolean(session.token),
  );

  if (profile.loading && !profile.data) return <LoadingBlock label="Loading profile" />;
  if (profile.error || !profile.data) {
    return <ErrorBlock message={profile.error ?? "Profile not found"} onRetry={profile.reload} />;
  }

  const user = profile.data.user;
  const counts = profile.data.counts ?? {};
  const level = profile.data.level;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Poster uri={user.bannerUrl} style={styles.banner} />
      <View style={styles.heading}>
        <Poster uri={user.avatarUrl} style={styles.avatar} />
        <View style={styles.copy}>
          <Text style={styles.name}>{user.username}</Text>
          <Text style={styles.meta}>
            {[user.role, user.presenceStatus, level ? `Level ${level.level}` : null].filter(Boolean).join(" · ")}
          </Text>
          {profile.data.follow ? (
            <Text style={styles.meta}>
              {profile.data.follow.followers ?? 0} followers · {profile.data.follow.following ?? 0} following
            </Text>
          ) : null}
        </View>
      </View>
      {user.bio ? <Text style={styles.bio}>{plainText(user.bio)}</Text> : null}
      <View style={styles.counts}>
        {Object.entries(counts).map(([key, value]) => (
          <View key={key} style={styles.count}>
            <Text style={styles.countValue}>{value}</Text>
            <Text style={styles.countLabel}>{COUNT_LABELS[key] ?? key}</Text>
          </View>
        ))}
      </View>
      {mine ? (
        <View style={styles.list}>
          <Text style={styles.section}>Your list</Text>
          {watchlist.loading ? <LoadingBlock /> : null}
          {watchlist.error ? <Text style={styles.meta}>{watchlist.error}</Text> : null}
          {(watchlist.data?.results ?? []).map((item) => (
            <Text key={`${item.animeId}-${item.folder}`} style={styles.listItem}>
              {item.anime?.title?.english || item.animeId} · {item.folder}
            </Text>
          ))}
          {!watchlist.loading && !watchlist.data?.results.length ? <Text style={styles.meta}>Nothing saved yet.</Text> : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, backgroundColor: colors.bg, flexGrow: 1 },
  banner: { width: "100%", height: 120, backgroundColor: colors.card },
  heading: { flexDirection: "row", gap: 12, padding: space.screen, alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36, marginTop: -36 },
  copy: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 22, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 13 },
  bio: { color: colors.text, lineHeight: 22, paddingHorizontal: space.screen },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: space.screen },
  count: { backgroundColor: colors.card, borderRadius: 12, padding: 10, minWidth: 88 },
  countValue: { color: colors.text, fontSize: 18, fontWeight: "800" },
  countLabel: { color: colors.muted, fontSize: 12 },
  list: { paddingHorizontal: space.screen, gap: 8 },
  section: { color: colors.text, fontSize: 18, fontWeight: "800" },
  listItem: { color: colors.text, fontSize: 15 },
});
