import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/seo/site-seo";

export default function robots(): MetadataRoute.Robots {
  const base = APP_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/user surfaces and internals out of the index.
        disallow: ["/api/", "/admin", "/settings", "/messages", "/chat", "/auth/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
