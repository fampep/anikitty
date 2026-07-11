"use client";

import { useCallback } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { formatForumTimeAgo } from "@/lib/social/forum";

export function useForumTimeAgo() {
  const { locale } = useI18n();
  return useCallback(
    (dateStr: string | null) => formatForumTimeAgo(dateStr, locale),
    [locale],
  );
}
