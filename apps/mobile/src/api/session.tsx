import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { apiRequest, defaultApiBase, normalizeApiBase } from "@/api/client";
import { getMe, login as loginRequest, verifyTwoFactor } from "@/api/catalog";
import type { AccountMe } from "@/api/types";

const TOKEN_KEY = "anikitty.token";
const BASE_KEY = "anikitty.apiBase";
const ADULT_KEY = "anikitty.showAdult";

type SessionValue = {
  ready: boolean;
  token: string | null;
  apiBase: string;
  showAdult: boolean;
  me: AccountMe | null;
  pending2fa: string | null;
  setApiBase: (value: string) => Promise<void>;
  setShowAdult: (value: boolean) => Promise<void>;
  login: (identifier: string, password: string) => Promise<"ok" | "2fa">;
  submit2fa: (code: string) => Promise<void>;
  cancel2fa: () => void;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

async function readKey(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [apiBase, setApiBaseState] = useState(defaultApiBase());
  const [showAdult, setShowAdultState] = useState(false);
  const [me, setMe] = useState<AccountMe | null>(null);
  const [pending2fa, setPending2fa] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setMe(null);
      return;
    }
    try {
      const next = await getMe({ base: apiBase, token });
      setMe(next);
    } catch {
      setMe(null);
    }
  }, [apiBase, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedToken, storedBase, storedAdult] = await Promise.all([
        readKey(TOKEN_KEY),
        readKey(BASE_KEY),
        readKey(ADULT_KEY),
      ]);
      if (cancelled) return;
      if (storedBase) {
        try {
          setApiBaseState(normalizeApiBase(storedBase));
        } catch {
          setApiBaseState(defaultApiBase());
        }
      }
      setShowAdultState(storedAdult === "1");
      setToken(storedToken);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refreshMe();
  }, [ready, refreshMe]);

  const setApiBase = useCallback(async (value: string) => {
    const next = normalizeApiBase(value);
    setApiBaseState(next);
    await SecureStore.setItemAsync(BASE_KEY, next);
  }, []);

  const setShowAdult = useCallback(async (value: boolean) => {
    setShowAdultState(value);
    await SecureStore.setItemAsync(ADULT_KEY, value ? "1" : "0");
  }, []);

  const applyToken = useCallback(async (next: string) => {
    setToken(next);
    setPending2fa(null);
    await SecureStore.setItemAsync(TOKEN_KEY, next);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const result = await loginRequest({ base: apiBase }, identifier, password);
      if (result.requires2fa) {
        if (!result.pendingToken) {
          throw new Error("Sign-in needs a second step, but the server did not return a token.");
        }
        setPending2fa(result.pendingToken);
        return "2fa" as const;
      }
      if (!result.token) throw new Error("Sign-in did not return a session.");
      await applyToken(result.token);
      return "ok" as const;
    },
    [apiBase, applyToken],
  );

  const submit2fa = useCallback(
    async (code: string) => {
      if (!pending2fa) throw new Error("Sign in again before entering a code.");
      const result = await verifyTwoFactor({ base: apiBase }, pending2fa, code);
      if (!result.token) throw new Error("Verification did not return a session.");
      await applyToken(result.token);
    },
    [apiBase, applyToken, pending2fa],
  );

  const cancel2fa = useCallback(() => setPending2fa(null), []);

  const logout = useCallback(async () => {
    const current = token;
    setToken(null);
    setMe(null);
    setPending2fa(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    if (current) {
      void apiRequest(apiBase, "/api/account/auth/logout", { method: "POST", token: current }).catch(() => undefined);
    }
  }, [apiBase, token]);

  const value = useMemo<SessionValue>(
    () => ({
      ready,
      token,
      apiBase,
      showAdult,
      me,
      pending2fa,
      setApiBase,
      setShowAdult,
      login,
      submit2fa,
      cancel2fa,
      logout,
      refreshMe,
    }),
    [
      ready,
      token,
      apiBase,
      showAdult,
      me,
      pending2fa,
      setApiBase,
      setShowAdult,
      login,
      submit2fa,
      cancel2fa,
      logout,
      refreshMe,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
