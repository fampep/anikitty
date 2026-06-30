import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://www.googletagmanager.com https://www.gstatic.com https://s0-greate.net https://push-sdk.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  isProd ? "connect-src 'self' https: wss:" : "connect-src 'self' https: http: wss: ws:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
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
  env: {
    NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ?? "",
  },
  experimental: {
    webpackMemoryOptimizations: true,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "framer-motion",
      "@vidstack/react",
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
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/, /\.map$/],
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
})(nextConfig);
