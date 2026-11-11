import { useEffect, useState } from "react";
import { TELEGRAM_CHANNEL_URL } from "@/constants/site-meta";

type SignupStatus = {
  open: boolean;
  telegramUrl: string;
  loaded: boolean;
};

/** Whether open signups are enabled (runtime check via status API). */
export function useOpenSignups(): SignupStatus {
  const [state, setState] = useState<SignupStatus>({
    open: false,
    telegramUrl: TELEGRAM_CHANNEL_URL,
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/account/auth/signup-status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setState({
            open: Boolean(data?.open),
            telegramUrl:
              typeof data?.telegramUrl === "string" && data.telegramUrl
                ? data.telegramUrl
                : TELEGRAM_CHANNEL_URL,
            loaded: true,
          });
        }
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, loaded: true }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
