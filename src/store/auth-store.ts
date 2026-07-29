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
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
