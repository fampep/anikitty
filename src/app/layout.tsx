import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";

import NavBar from "@/components/layout/navbar";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import SkipToContent from "@/components/layout/skip-to-content";
import Footer from "@/components/layout/footer";
import ScrollToTop from "@/components/layout/scroll-to-top";
import SiteAnnouncementBanner from "@/components/layout/site-announcement-banner";
import NetworkOfflineBanner from "@/components/layout/network-offline-banner";
import I18nRoot from "@/components/layout/i18n-root";
import Script from "next/script";
import QueryProvider from "@/providers/query-provider";
import { PublicEnvScript } from "next-runtime-env";

import { ThemeProvider } from "@/components/layout/theme-provider";
import SiteDisplaySync from "@/components/layout/site-display-sync";
import PwaRegister from "@/components/pwa/pwa-register";
import DiscordWelcomePrompt from "@/components/site/discord-welcome-prompt";
import SettingsSync from "@/components/layout/settings-sync";
import OnlinePresence from "@/components/common/online-presence";
import { buildSurfaceFoucScript } from "@/lib/core/site-surface";
import DisableDevtoolGuard from "@/components/security/disable-devtool-guard";

import { Toaster } from "@/components/ui/sonner";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import {
  APP_DEFAULT_TITLE,
  APP_DESCRIPTION,
  APP_NAME,
  APP_URL,
  SITE_APPLE_ICON,
  SITE_FAVICON,
  SITE_FAVICON_ICO,
  SITE_ICON,
  SITE_ICON_512,
  SITE_LOGO,
} from "@/lib/seo/site-seo";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID?.trim() || "G-X9RZ58XPH1";
const ENABLE_ANALYTICS =
  process.env.NODE_ENV === "production" && GA_MEASUREMENT_ID.length > 0;

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
      // Prefer PNG (Google Search likes ≥48px multiples); ico kept as legacy fallback.
      { url: SITE_ICON, type: "image/png", sizes: "192x192" },
      { url: SITE_ICON_512, type: "image/png", sizes: "512x512" },
      { url: SITE_FAVICON, type: "image/png", sizes: "96x96" },
      { url: SITE_LOGO, type: "image/png", sizes: "512x512" },
      { url: SITE_FAVICON_ICO, sizes: "any" },
    ],
    apple: [{ url: SITE_APPLE_ICON, sizes: "180x180", type: "image/png" }],
    shortcut: SITE_ICON,
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Keep user pinch-zoom; do not set maximumScale (a11y). Fit covers notches.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
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
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='anikitty-theme',s=localStorage.getItem(k),t=s||'dark';if(t==='system'){document.documentElement.classList.toggle('dark',window.matchMedia('(prefers-color-scheme: dark)').matches)}else{document.documentElement.classList.toggle('dark',t==='dark')}}catch(e){}})();${buildSurfaceFoucScript()}`,
          }}
        />
        {ENABLE_ANALYTICS && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');`}
            </Script>
          </>
        )}
        <PublicEnvScript />
        <link rel="icon" href={SITE_ICON} type="image/png" sizes="192x192" />
        <link rel="icon" href={SITE_ICON_512} type="image/png" sizes="512x512" />
        <link rel="icon" href={SITE_FAVICON} type="image/png" sizes="96x96" />
        <link rel="icon" href={SITE_FAVICON_ICO} sizes="any" />
        <link rel="apple-touch-icon" href={SITE_APPLE_ICON} sizes="180x180" />
        {/* Poster/artwork CDNs — warm the connection so images load a round-trip sooner. */}
        <link rel="preconnect" href="https://s4.anilist.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://artworks.thetvdb.com" />
        <link rel="dns-prefetch" href="https://cdn.myanimelist.net" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
      </head>
      <body
        className={`${geistSans.className} antialiased max-w-[100vw] overflow-x-hidden min-h-dvh`}
      >
        <PwaRegister />
        <DisableDevtoolGuard />
        <I18nRoot initialLocale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            storageKey="anikitty-theme"
            disableTransitionOnChange
          >
            <QueryProvider>
              <SiteDisplaySync />
              <SkipToContent />
              <NavBar />
              <NetworkOfflineBanner />
              <SiteAnnouncementBanner />
              <main id="main" tabIndex={-1} className="site-page">
                {children}
              </main>
              <Footer />
              <MobileBottomNav />
              <ScrollToTop />
              <DiscordWelcomePrompt />
              <SettingsSync />
              <OnlinePresence />
            </QueryProvider>
          </ThemeProvider>
        </I18nRoot>
        <Toaster />
      </body>
    </html>
  );
}
