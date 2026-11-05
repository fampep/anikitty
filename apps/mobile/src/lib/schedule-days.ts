/** Same weekday query the website schedule page sends to `/api/schedule`. */
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

const SCHEDULE_LOCALE = "en-US";

export function getCurrentScheduleDay(referenceDate = new Date()): ScheduleDay {
  const day = referenceDate.toLocaleString(SCHEDULE_LOCALE, { weekday: "long" }).toLowerCase();
  return SCHEDULE_DAYS.includes(day as ScheduleDay) ? (day as ScheduleDay) : "monday";
}

export function getDateForWeekday(targetDay: ScheduleDay, referenceDate: Date): Date {
  const currentDayIndex = referenceDate.getDay();
  const targetIndex = SCHEDULE_DAYS.indexOf(targetDay);
  const date = new Date(referenceDate);
  date.setDate(referenceDate.getDate() + (targetIndex - currentDayIndex));
  return date;
}

export function formatScheduleQueryDate(date: Date): string {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next.toLocaleDateString(SCHEDULE_LOCALE);
}

export function scheduleDayLabel(day: ScheduleDay): string {
  return day.slice(0, 1).toUpperCase() + day.slice(1, 3);
}
