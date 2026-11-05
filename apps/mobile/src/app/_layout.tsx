import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/api/session";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="anime/[id]" options={{ title: "Anime" }} />
        <Stack.Screen name="watch/[id]" options={{ headerShown: false, orientation: "portrait" }} />
        <Stack.Screen name="user/[username]" options={{ title: "Profile" }} />
      </Stack>
    </SessionProvider>
  );
}
