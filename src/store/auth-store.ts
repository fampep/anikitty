import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IAuth = {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bannerUrl?: string | null;
  bio?: string | null;
  themeColor?: string | null;
  role?: string | null;
  permissions?: string[];
  supporterUntil?: string | null;
  discordBoosting?: boolean;
  kittycoinBalance?: number;
  equippedFrame?: string | null;
  equippedSticker?: string | null;
  equippedIcon?: string | null;
};

export interface IAuthStore {
  auth: IAuth | null;
  setAuth: (state: IAuth) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<IAuthStore>()(
  persist(
    (set) => ({
      auth: null,
      setAuth: (state: IAuth) => set({ auth: state }),
      clearAuth: () => set({ auth: null }),
    }),
    {
      name: "auth",
      partialize: (state) => ({ auth: state.auth }),
      version: 4,
    },
  ),
);

/** Subscribe so components re-render once persist finishes hydrating. */
export function useAuthHydrated() {
  // `persist` is absent in the SSR bundle, so read it defensively — otherwise
  // the initialiser throws during server render and the tree falls back to
  // client-only rendering. Server always reports false, which also keeps the
  // first client paint identical and avoids a hydration mismatch.
  const [hydrated, setHydrated] = useState(
    () => useAuthStore.persist?.hasHydrated() ?? false,
  );
  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }
    setHydrated(persist.hasHydrated());
    return persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
