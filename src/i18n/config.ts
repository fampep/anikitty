export const LOCALE_COOKIE = "anikitty-locale";

export const defaultLocale = "en" as const;

export const locales = ["en", "es", "fr", "de", "da", "pt", "ja", "ko", "zh"] as const;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  da: "Dansk",
  pt: "Português",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return Boolean(value && locales.includes(value as Locale));
}

export function resolveLocale(
  cookieLocale?: string | null,
  acceptLanguage?: string | null,
): Locale {
  if (isLocale(cookieLocale)) return cookieLocale;

  if (acceptLanguage) {
    const parts = acceptLanguage.split(",").map((p) => p.trim().split(";")[0]?.toLowerCase());
    for (const part of parts) {
      if (!part) continue;
      const base = part.split("-")[0];
      if (isLocale(part)) return part;
      if (isLocale(base)) return base;
    }
  }

  return defaultLocale;
}
