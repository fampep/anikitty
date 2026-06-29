"use client";

import { I18nProvider, useClientLocaleBootstrap } from "@/providers/i18n-provider";
import type { Locale } from "@/i18n/config";

function LocaleBootstrap({ children }: { children: React.ReactNode }) {
  useClientLocaleBootstrap();
  return children;
}

export default function I18nRoot({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <LocaleBootstrap>{children}</LocaleBootstrap>
    </I18nProvider>
  );
}
