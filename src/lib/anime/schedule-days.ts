export const SCHEDULE_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

export function getCurrentScheduleDay(locale: string, referenceDate = new Date()): ScheduleDay {
  const day = referenceDate.toLocaleString(locale, { weekday: "long" }).toLowerCase();
  return (SCHEDULE_DAYS.includes(day as ScheduleDay) ? day : "monday") as ScheduleDay;
}

export function getDateForWeekday(
  targetDay: ScheduleDay,
  referenceDate: Date,
): Date {
  const currentDayIndex = referenceDate.getDay();
  const targetIndex = SCHEDULE_DAYS.indexOf(targetDay);
  const diff = targetIndex - currentDayIndex;
  const date = new Date(referenceDate);
  date.setDate(referenceDate.getDate() + diff);
  return date;
}

/** Date string passed to `/api/schedule` (matches existing schedule page logic). */
export function formatScheduleQueryDate(date: Date, locale: string): string {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next.toLocaleDateString(locale);
}
