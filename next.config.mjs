import withPWAInit from "@ducanh2912/next-pwa";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://www.googletagmanager.com https://www.gstatic.com https://al5sm.com https://www.fickle-association.com https://fickle-association.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  isProd ? "connect-src 'self' https: wss:" : "connect-src 'self' https: http: wss: ws:",
  "media-src 'self' blob: https:",
  "frame-src 'self' https:",
  "worker-src 'self' blob: https://al5sm.com https://www.fickle-association.com https://fickle-association.com",

  "manifest-src 'self'",
  ...(isProd ? ["upgrade-insecure-requests", "block-all-mixed-content"] : []),
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Types are checked locally via `npm run typecheck`; skip during Coolify/Railpack builds (CI=true).
    ignoreBuildErrors:
      process.env.SKIP_NEXT_TYPECHECK === "1" || process.env.CI === "true",
  },
  env: {
    NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ?? "",
  },
  experimental: {
    webpackMemoryOptimizations: true,
    staticGenerationMaxConcurrency: 1,
    ...(process.env.CI === "true" ? { cpus: 1 } : {}),
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "framer-motion",
      "artplayer",
    ],
  },
  webpack: (config) => {
    // Coolify/Docker hosts often have limited RAM; serial webpack work avoids OOM kills.
    if (process.env.CI === "true") {
      config.parallelism = 1;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/voice-actors",
        destination: "/search",
        permanent: true,
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
      },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
      { key: "Origin-Agent-Cluster", value: "?1" },
      { key: "Content-Security-Policy", value: csp },
    ];

    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/kitty/hls",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Range, Content-Type" },
        ],
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  register: false,
  disable: process.env.NODE_ENV === "development",
  sw: "pwa-sw.js",
  scope: "/",
  // Served when a navigation request fails with no connection.
  fallbacks: { document: "/offline" },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    exclude: [/middleware-manifest\.json$/, /\.map$/, /^worker-.*\.js$/],
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-webfonts",
          expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: { maxEntries: 24, maxAgeSeconds: 12 * 60 * 60 },
        },
      },
    ],
  },
});

export default withPWA(nextConfig);
