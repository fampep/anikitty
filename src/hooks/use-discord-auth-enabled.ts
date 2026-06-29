import { useEffect, useState } from "react";

/** Whether Discord OAuth login/linking is configured on the server (runtime check). */
export function useDiscordAuthEnabled(): boolean {
  const [enabled, setEnabled] = useState(() => !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/account/auth/discord/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setEnabled(Boolean(data?.enabled));
      } catch {
        /* keep build-time fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
