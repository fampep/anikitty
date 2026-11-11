"use client";

import { useState } from "react";
import { toast } from "sonner";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { accountAuth } from "@/lib/oauth/account";
import { PassphraseReveal } from "@/components/auth/passphrase-reveal";
import { usePendingPassphraseStore } from "@/store/pending-passphrase-store";
import { useT } from "@/providers/i18n-provider";
import {
  readCurrentNextParam,
  safeInternalNextPath,
} from "@/lib/auth/safe-next-path";

/**
 * Root-level passphrase reveal. Survives login-popover unmount when signup
 * flips the auth store to logged-in.
 */
export default function PassphraseOnboardingModal() {
  const t = useT();
  const passphrase = usePendingPassphraseStore((s) => s.passphrase);
  const clear = usePendingPassphraseStore((s) => s.clear);
  const [busy, setBusy] = useState(false);
  const passkeySupported =
    typeof window !== "undefined" ? browserSupportsWebAuthn() : false;

  if (!passphrase) return null;

  const finish = () => {
    clear();
    const next = readCurrentNextParam() ?? safeInternalNextPath("/home");
    if (typeof window !== "undefined" && next) {
      window.location.assign(next);
    }
  };

  const handleAddPasskey = async () => {
    setBusy(true);
    try {
      const { options, pendingToken } = await accountAuth.passkeyRegisterOptions(
        t("auth.defaultPasskeyName"),
      );
      const response = await startRegistration({ optionsJSON: options });
      await accountAuth.passkeyRegisterVerify(pendingToken, response);
      toast.success(t("auth.passkeyAdded"));
      finish();
    } catch (e: unknown) {
      const err = e as { name?: string; body?: { error?: string }; message?: string };
      if (err?.name === "NotAllowedError") {
        toast.error(t("auth.passkeyCancelled"));
      } else {
        toast.error(err?.body?.error ?? err?.message ?? t("auth.passkeyAddFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="passphrase-onboarding-title"
        className="w-full max-w-md rounded-2xl border border-border dark:border-white/12 bg-[#0a0a0a] p-5 shadow-2xl"
      >
        <h2 id="passphrase-onboarding-title" className="sr-only">
          {t("auth.passphraseTitle")}
        </h2>
        <PassphraseReveal
          passphrase={passphrase}
          passkeyBusy={busy}
          onAddPasskey={passkeySupported ? () => void handleAddPasskey() : undefined}
          onDismiss={finish}
        />
      </div>
    </div>
  );
}
