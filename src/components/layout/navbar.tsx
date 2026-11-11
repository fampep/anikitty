"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { accountAuth, clearAccountToken, authFromMeResponse } from "@/lib/oauth/account";
import { hasLikelyAuthSession } from "@/lib/auth/auth-fetch";
import { takeStashedOAuthNextPath } from "@/lib/auth/safe-next-path";
import { useT } from "@/providers/i18n-provider";
import { toast } from "sonner";

/**
 * Headless. Navigation lives in the floating bottom pill (MobileBottomNav);
 * this component stays mounted only to restore the session on load and to
 * finish the Discord OAuth round-trip. It renders nothing.
 */
const NavBar = () => {
  const t = useT();
  const user = useAuthStore((s) => s.auth);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const meProbeRef = useRef(false);

  useEffect(() => {
    if (user) {
      meProbeRef.current = false;
      return;
    }
    if (meProbeRef.current) return;
    meProbeRef.current = true;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        // Always probe once — HttpOnly session cookies are invisible to JS.
        try {
          const me = await accountAuth.me();
          if (!cancelled) setAuth(authFromMeResponse(me));
        } catch (e: unknown) {
          const status = (e as { status?: number })?.status;
          if (!cancelled && status === 401 && hasLikelyAuthSession()) {
            clearAccountToken();
            clearAuth();
          }
        }
      })();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, setAuth, clearAuth]);

  const oauthHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || oauthHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const discord = params.get("discord");
    const anilist = params.get("anilist");
    if (!discord && !anilist) return;

    oauthHandledRef.current = true;

    const discordErrorKeys: Record<string, string> = {
      cancelled: "auth.discordCancelled",
      not_configured: "auth.discordNotConfigured",
      banned: "auth.discordBanned",
      email_conflict: "auth.discordEmailConflict",
      signups_closed: "auth.signupsClosedToast",
      invalid_state: "auth.discordLoginFailed",
      token_exchange: "auth.discordLoginFailed",
      user_fetch: "auth.discordLoginFailed",
      server: "auth.discordLoginFailed",
    };

    const anilistErrorKeys: Record<string, string> = {
      cancelled: "auth.anilistCancelled",
      missing_params: "auth.anilistLoginFailed",
      signups_closed: "auth.signupsClosedToast",
      banned: "auth.discordBanned",
      user_creation: "auth.anilistLoginFailed",
      token_exchange: "auth.anilistLoginFailed",
      user_fetch: "auth.anilistLoginFailed",
      server: "auth.anilistLoginFailed",
    };

    const applyWelcome = (messageKey: string) => {
      toast.success(t(messageKey));
      void accountAuth
        .me()
        .then((me) => {
          setAuth(authFromMeResponse(me));
          const dest = takeStashedOAuthNextPath();
          if (dest && dest !== window.location.pathname + window.location.search) {
            window.location.assign(dest);
          }
        })
        .catch(() => {});
    };

    if (discord === "welcome") {
      applyWelcome("auth.discordWelcome");
    } else if (discord) {
      const key = discordErrorKeys[discord] ?? "auth.discordLoginFailed";
      toast.error(t(key));
    }

    if (anilist === "welcome") {
      applyWelcome("auth.anilistWelcome");
    } else if (anilist) {
      const key = anilistErrorKeys[anilist] ?? "auth.anilistLoginFailed";
      toast.error(t(key));
    }

    params.delete("discord");
    params.delete("anilist");
    const cleaned = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", cleaned);
  }, [setAuth, t]);

  return null;
};

export default NavBar;
