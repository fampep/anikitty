import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://www.googletagmanager.com https://www.gstatic.com https://3nbf4.com https://push-sdk.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  isProd ? "connect-src 'self' https: wss:" : "connect-src 'self' https: http: wss: ws:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob: https://3nbf4.com",
  "manifest-src 'self'",
  ...(isProd ? ["upgrade-insecure-requests", "block-all-mixed-content"] : []),
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Types are checked locally/CI; skip in Railpack/Coolify to avoid OOM during deploy builds.
    ignoreBuildErrors: process.env.SKIP_NEXT_TYPECHECK === "1",
  },
  env: {
    NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ?? "",
  },
  experimental: {
    webpackMemoryOptimizations: true,
    staticGenerationMaxConcurrency: 1,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "framer-motion",
      "artplayer",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
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

export default withPWA({
  dest: "public",
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  sw: "sw.js",
  scope: "/",
  importScripts: [
    "/monetag-sw-init.js",
    "https://3nbf4.com/act/files/service-worker.min.js?r=sw",
  ],
  buildExcludes: [/middleware-manifest\.json$/, /\.map$/, /^worker-.*\.js$/],
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
        expiration: { maxEntries: 64, maxAgeSeconds: 24 * 60 * 60 },
      },
    },
  ],
})(nextConfig);
