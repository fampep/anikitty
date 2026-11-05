import { useEffect, useState, type ComponentProps } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSession } from "@/api/session";
import { Poster } from "@/components/Poster";
import { colors, space } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const session = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [server, setServer] = useState(session.apiBase);
  useEffect(() => {
    setServer(session.apiBase);
  }, [session.apiBase]);
  const [lookup, setLookup] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLogin() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await session.login(identifier.trim(), password);
      if (result === "2fa") setMessage("Enter the code from your authenticator.");
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function on2fa() {
    setBusy(true);
    setMessage(null);
    try {
      await session.submit2fa(code.trim());
      setCode("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveServer() {
    setMessage(null);
    try {
      await session.setApiBase(server);
      setMessage("Server saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the server");
    }
  }

  const user = session.me?.user;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Profile</Text>
          {user ? (
            <Pressable
              style={styles.identity}
              onPress={() => router.push({ pathname: "/user/[username]", params: { username: user.username } })}
            >
              <Poster uri={user.avatarUrl} style={styles.avatar} />
              <View style={styles.copy}>
                <Text style={styles.name}>{user.username}</Text>
                <Text style={styles.meta}>{user.role}</Text>
                {session.me?.kittycoinBalance != null ? (
                  <Text style={styles.meta}>{session.me.kittycoinBalance} kittycoins</Text>
                ) : null}
              </View>
            </Pressable>
          ) : (
            <Text style={styles.lead}>Sign in with the same account the website uses.</Text>
          )}

          {message ? <Text style={styles.message}>{message}</Text> : null}

          {!user && !session.pending2fa ? (
            <View style={styles.form}>
              <Field value={identifier} onChangeText={setIdentifier} placeholder="Username or email" />
              <Field value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
              <Primary label={busy ? "Signing in" : "Sign in"} onPress={() => void onLogin()} disabled={busy} />
            </View>
          ) : null}

          {session.pending2fa ? (
            <View style={styles.form}>
              <Field value={code} onChangeText={setCode} placeholder="Authenticator code" keyboardType="number-pad" />
              <Primary label={busy ? "Checking" : "Verify"} onPress={() => void on2fa()} disabled={busy} />
              <Pressable onPress={session.cancel2fa}>
                <Text style={styles.link}>Use a different account</Text>
              </Pressable>
            </View>
          ) : null}

          {user ? (
            <View style={styles.form}>
              <Text style={styles.label}>Look up a profile</Text>
              <Field value={lookup} onChangeText={setLookup} placeholder="Username" autoCapitalize="none" />
              <Primary
                label="Open profile"
                onPress={() => {
                  const username = lookup.trim();
                  if (!username) return;
                  router.push({ pathname: "/user/[username]", params: { username } });
                }}
              />
              <Pressable onPress={() => void session.logout()}>
                <Text style={styles.link}>Sign out</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Show adult titles</Text>
              <Switch
                value={session.showAdult}
                onValueChange={(value) => void session.setShowAdult(value)}
                trackColor={{ true: colors.accent, false: colors.line }}
              />
            </View>
            <Text style={styles.label}>API server</Text>
            <Field
              value={server}
              onChangeText={setServer}
              placeholder="http://10.0.2.2:3000"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Primary label="Save server" onPress={() => void onSaveServer()} />
            <Text style={styles.meta}>The app calls this Anikitty server. It does not open the website.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={colors.faint} style={styles.input} {...props} />;
}

function Primary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: space.screen, gap: 16, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  lead: { color: colors.muted, lineHeight: 20 },
  identity: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  copy: { gap: 2 },
  name: { color: colors.text, fontSize: 20, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 13 },
  message: { color: colors.text },
  form: { gap: 10 },
  label: { color: colors.text, fontWeight: "700" },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: colors.accentInk, fontWeight: "800" },
  link: { color: colors.accent, fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
