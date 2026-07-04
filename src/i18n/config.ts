export const LOCALE_COOKIE = "anikitty-locale";

export const defaultLocale = "en" as const;

export const locales = ["en"] as const;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en";
}

export function resolveLocale(
  _cookieLocale?: string | null,
  _acceptLanguage?: string | null,
): Locale {
  return defaultLocale;
}
