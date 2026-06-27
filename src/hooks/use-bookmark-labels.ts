import { useMemo } from "react";
import {
  Ban,
  BookmarkCheck,
  CheckCheck,
  Hand,
  TvMinimalPlay,
} from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import type { ISelectOptions } from "@/components/common/select";

const BOOKMARK_STATUSES = [
  { value: "plan to watch", key: "planToWatch", icon: BookmarkCheck },
  { value: "watching", key: "watching", icon: TvMinimalPlay },
  { value: "completed", key: "completed", icon: CheckCheck },
  { value: "on hold", key: "onHold", icon: Hand },
  { value: "dropped", key: "dropped", icon: Ban },
] as const;

export function useBookmarkLabels(): ISelectOptions[] {
  const t = useT();

  return useMemo(
    () =>
      BOOKMARK_STATUSES.map((s) => ({
        value: s.value,
        label: t(`anime.bookmark.${s.key}`),
        icon: s.icon,
      })),
    [t],
  );
}
