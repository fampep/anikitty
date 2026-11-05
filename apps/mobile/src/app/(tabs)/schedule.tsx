import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getSchedule } from "@/api/catalog";
import { useSession } from "@/api/session";
import { Poster } from "@/components/Poster";
import { ErrorBlock, LoadingBlock } from "@/components/State";
import { formatAirTime, useLoad } from "@/lib/load";
import {
  SCHEDULE_DAYS,
  formatScheduleQueryDate,
  getCurrentScheduleDay,
  getDateForWeekday,
  scheduleDayLabel,
  type ScheduleDay,
} from "@/lib/schedule-days";
import { colors, space } from "@/theme";

export default function ScheduleScreen() {
  const router = useRouter();
  const { apiBase, ready } = useSession();
  const today = useMemo(() => new Date(), []);
  const [day, setDay] = useState<ScheduleDay>(getCurrentScheduleDay(today));
  const queryDate = formatScheduleQueryDate(getDateForWeekday(day, today));
  const schedule = useLoad(
    `schedule:${apiBase}:${queryDate}:${ready}`,
    () => getSchedule({ base: apiBase }, queryDate),
    ready,
  );
  const items = schedule.data?.data.scheduledAnimes ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>Schedule</Text>
      <View style={styles.days}>
        {SCHEDULE_DAYS.map((name) => {
          const selected = name === day;
          return (
            <Pressable key={name} onPress={() => setDay(name)} style={[styles.day, selected && styles.dayOn]}>
              <Text style={[styles.dayText, selected && styles.dayTextOn]}>{scheduleDayLabel(name)}</Text>
            </Pressable>
          );
        })}
      </View>
      {schedule.loading && !schedule.data ? <LoadingBlock label="Loading airings" /> : null}
      {schedule.error ? <ErrorBlock message={schedule.error} onRetry={schedule.reload} /> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.id}-${item.episode}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!schedule.loading && !schedule.error ? <Text style={styles.empty}>Nothing scheduled.</Text> : undefined}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: "/anime/[id]", params: { id: item.id } })}
          >
            <Poster uri={item.poster} style={styles.poster} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                Episode {item.episode} · {formatAirTime(item.airingTimestamp)}
                {item.audio?.length ? ` · ${item.audio.join("/")}` : ""}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", paddingHorizontal: space.screen },
  days: { flexDirection: "row", gap: 6, paddingHorizontal: space.screen, paddingVertical: 14 },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
  },
  dayOn: { backgroundColor: colors.accent },
  dayText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  dayTextOn: { color: colors.accentInk },
  list: { paddingHorizontal: space.screen, paddingBottom: 24, gap: 12 },
  empty: { color: colors.muted, paddingVertical: 20 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  poster: { width: 52, height: 74, borderRadius: 8 },
  copy: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 13 },
});
