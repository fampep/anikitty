import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";

import NavBar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import SiteBetaBadge from "@/components/layout/site-beta-badge";
import SiteAnnouncementBanner from "@/components/layout/site-announcement-banner";
import DonationGoalBanner from "@/components/layout/donation-goal-banner";
import I18nRoot from "@/components/layout/i18n-root";
import Script from "next/script";
import QueryProvider from "@/providers/query-provider";
import { PublicEnvScript } from "next-runtime-env";

import { ThemeProvider } from "@/components/layout/theme-provider";
import UserThemeSync from "@/components/layout/user-theme-sync";
import ClickAdsLoader from "@/components/ads/click-ads-loader";

import { Toaster } from "@/components/ui/sonner";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import {
  APP_DEFAULT_TITLE,
  APP_DESCRIPTION,
  APP_NAME,
  APP_URL,
  SITE_APPLE_ICON,
  SITE_FAVICON,
  SITE_LOGO,
} from "@/lib/seo/site-seo";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  title: APP_DEFAULT_TITLE,
  description: APP_DESCRIPTION,
  icons: {
    icon: [
      { url: SITE_FAVICON, type: "image/png" },
      { url: SITE_LOGO, type: "image/png" },
    ],
    apple: SITE_APPLE_ICON,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_DEFAULT_TITLE,
  },
  manifest: "/manifest.json",
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    url: APP_URL,
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AniKitty — Free Anime Streaming",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headersList = await headers();
  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headersList.get("accept-language"),
  );

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-X9RZ58XPH1"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-X9RZ58XPH1');`}
        </Script>
        <PublicEnvScript />
        <link rel="icon" href={SITE_FAVICON} type="image/png" />
        <link rel="apple-touch-icon" href={SITE_APPLE_ICON} />
      </head>
      <body
        className={`${geistSans.className} antialiased max-w-[100vw] overflow-x-hidden min-h-screen`}
      >
        <ClickAdsLoader />
        <I18nRoot initialLocale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <UserThemeSync />
              <NavBar />
              <DonationGoalBanner />
              <SiteAnnouncementBanner />
              {children}
              <Footer />
              <SiteBetaBadge />
            </QueryProvider>
          </ThemeProvider>
        </I18nRoot>
        <Toaster />
      </body>
    </html>
  );
}
