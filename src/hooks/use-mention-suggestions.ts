"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { withAuth } from "@/lib/auth/auth-fetch";

export type MentionUser = { username: string; avatarUrl?: string | null };

// Token being typed right before the caret, e.g. "@nar".
const TOKEN_RE = /(?:^|[^A-Za-z0-9_])@([A-Za-z0-9_]{1,32})$/;

/**
 * Drives @username autocomplete for a textarea. Detects the `@token` at the
 * caret, fetches matches, and rewrites the token when one is chosen.
 */
export function useMentionSuggestions(
  value: string,
  setValue: (v: string) => void,
  ref: RefObject<HTMLTextAreaElement>,
) {
  const [token, setToken] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const tokenStartRef = useRef(0);

  // Find the active @token from the text before the caret.
  const scan = useCallback(() => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const m = before.match(TOKEN_RE);
    if (!m) {
      setToken(null);
      return;
    }
    tokenStartRef.current = caret - m[1].length - 1;
    setToken(m[1]);
  }, [value, ref]);

  useEffect(() => {
    if (token === null) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(token)}`, withAuth());
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { users?: MentionUser[] };
        if (!cancelled) setSuggestions(data.users ?? []);
      } catch {
        /* ignore */
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token]);

  const apply = useCallback(
    (username: string) => {
      const el = ref.current;
      const caret = el?.selectionStart ?? value.length;
      const start = tokenStartRef.current;
      const next = `${value.slice(0, start)}@${username} ${value.slice(caret)}`;
      setValue(next);
      setToken(null);
      setSuggestions([]);
      requestAnimationFrame(() => {
        const pos = start + username.length + 2;
        el?.focus();
        el?.setSelectionRange(pos, pos);
      });
    },
    [value, setValue, ref],
  );

  const close = useCallback(() => setToken(null), []);

  return {
    suggestions: token !== null ? suggestions : [],
    open: token !== null && suggestions.length > 0,
    scan,
    apply,
    close,
  };
}
