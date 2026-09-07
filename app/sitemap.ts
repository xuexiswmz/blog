import type { MetadataRoute } from "next";
import { getPostSummaries, type PostSummary } from "@/lib/posts";
import { SITE_URL } from "@/lib/seo/site";

type SitemapPost = Pick<PostSummary, "slug" | "date">;

function parsePostDate(date: string): Date | undefined {
  if (!date) {
    return undefined;
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}

export function buildSitemap(
  siteUrl: string,
  posts: SitemapPost[],
): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/graph`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...posts.map((post) => ({
      url: `${siteUrl}/posts/${post.slug}`,
      lastModified: parsePostDate(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(SITE_URL, await getPostSummaries());
}
