import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";

import NavBar from "@/components/navbar";
import Footer from "@/components/footer";
import SiteAnnouncementBanner from "@/components/site-announcement-banner";
import Script from "next/script";
import QueryProvider from "@/providers/query-provider";
import { PublicEnvScript } from "next-runtime-env";

import { ThemeProvider } from "@/components/theme-provider";

import { Toaster } from "@/components/ui/sonner";

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

const APP_NAME = "AniKitty";
const APP_DEFAULT_TITLE = "AniKitty | Anime Streaming";
const APP_DESCRIPTION = "Stream your favourite anime for free with no ads ~ nya~";
const APP_URL = "https://anikitty.moe";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  title: APP_DEFAULT_TITLE,
  description: APP_DESCRIPTION,
  icons: {
    icon: "/jiji.jpg",
    apple: "/jiji.jpg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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
  },
  twitter: {
    card: "summary_large_image",
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          strategy="afterInteractive"
        />
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
        <link rel="icon" href="/jiji.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/jiji.jpg" />
      </head>
      <body
        className={`${geistSans.className} antialiased max-w-[100vw] overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <NavBar />
            <SiteAnnouncementBanner />
            {children}
            <Footer />
          </QueryProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
