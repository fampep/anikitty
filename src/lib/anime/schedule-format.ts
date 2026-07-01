export function formatScheduleAiringLabel(
  secondsUntilAiring: number,
  airingTimestamp: number,
  locale: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): { label: string; sublabel?: string; aired: boolean; nearby: boolean } {
  const aired = secondsUntilAiring <= 0;
  const nearby = !aired && Math.abs(airingTimestamp - Date.now()) < 60 * 60 * 1000;
  const time = new Date(airingTimestamp).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (aired) {
    return {
      label: t("schedule.airedAt", { time }),
      aired: true,
      nearby: false,
    };
  }

  if (secondsUntilAiring < 3600) {
    const m = Math.max(1, Math.ceil(secondsUntilAiring / 60));
    return {
      label: t("home.inMinutes", { m }),
      sublabel: time,
      aired: false,
      nearby,
    };
  }

  return {
    label: time,
    aired: false,
    nearby,
  };
}
