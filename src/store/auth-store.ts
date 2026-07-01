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

export const useAuthHydrated = () => useAuthStore.persist.hasHydrated();
