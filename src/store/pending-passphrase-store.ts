import { create } from "zustand";

type PendingPassphraseStore = {
  passphrase: string | null;
  setPassphrase: (passphrase: string) => void;
  clear: () => void;
};

/**
 * Holds the one-time passphrase reveal after signup so the modal can live at
 * the app root (login popovers unmount when auth flips to logged-in).
 */
export const usePendingPassphraseStore = create<PendingPassphraseStore>((set) => ({
  passphrase: null,
  setPassphrase: (passphrase) => set({ passphrase }),
  clear: () => set({ passphrase: null }),
}));
