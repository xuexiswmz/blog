import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export function buildRobots(siteUrl: string): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots(SITE_URL);
}
