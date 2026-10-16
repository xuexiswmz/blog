import ArticleCommentsProvider from "@/components/Comments/Article/providers/ArticleCommentsProvider";
import ArticleVisitTracker from "@/components/Analytics/ArticleVisitTracker";
import ArticleReadingLayout from "@/components/Articles/ArticleReadingLayout";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    alternates: {
      canonical: `/posts/${encodeURIComponent(slug)}`,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  const [{ default: Post }, groups] = await Promise.all([
    import(`@/content/posts/${slug}.mdx`),
    import("@/lib/articleCategories/services/articleCategoryService").then(
      ({ getPublicArticleNavigation }) => getPublicArticleNavigation(),
    ),
  ]);

  return (
    <ArticleReadingLayout groups={groups} currentSlug={slug}>
      <ArticleCommentsProvider postSlug={slug} key={slug}>
        <ArticleVisitTracker postSlug={slug} />
        <Post />
      </ArticleCommentsProvider>
    </ArticleReadingLayout>
  );
}

export async function generateStaticParams() {
  const postsDirectory = path.join(process.cwd(), "content", "posts");

  const filenames = await readdir(postsDirectory);

  return filenames
    .filter((filename) => filename.endsWith(".mdx"))
    .map((filename) => ({
      slug: filename.replace(/\.mdx$/, ""),
    }));
}

export const dynamicParams = false;
export const dynamic = "force-dynamic";
