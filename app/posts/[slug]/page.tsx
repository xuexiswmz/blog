import ArticleCommentsProvider from "@/components/Comments/Article/providers/ArticleCommentsProvider";
import ArticleVisitTracker from "@/components/Analytics/ArticleVisitTracker";
import ArticleReadingLayout from "@/components/Articles/ArticleReadingLayout";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

  // 文章是构建期从 content/posts 打包进来的，数据库里没有文章记录。
  // 文章被删除后，旧链接仍可能被访问；这里先确认文件存在，不存在就 404，
  // 否则动态 import 会抛 MODULE_NOT_FOUND，最终变成 500。
  const postsDirectory = path.join(process.cwd(), "content", "posts");
  const filenames = await readdir(postsDirectory);

  if (!filenames.includes(`${slug}.mdx`)) {
    notFound();
  }

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
