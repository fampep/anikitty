import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/seo/site-seo";
import { getAdminPanelPath } from "@/lib/security/admin-panel-path";

export default function robots(): MetadataRoute.Robots {
  const base = APP_URL.replace(/\/$/, "");
  const panel = getAdminPanelPath();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/user surfaces and internals out of the index.
        disallow: [
          "/api/",
          "/admin",
          panel,
          "/settings",
          "/messages",
          "/chat",
          "/auth/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
