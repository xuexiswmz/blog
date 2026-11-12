import { notFound } from "next/navigation";
import ArticleUploadForm from "@/components/Admin/Articles/ArticleUploadForm";
import { getArticleForEdit } from "@/lib/articles/articleFile";
import { getPostSummaries } from "@/lib/posts";

type EditArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditArticlePage({
  params,
}: EditArticlePageProps) {
  const { slug } = await params;
  const [article, posts] = await Promise.all([
    getArticleForEdit(slug),
    getPostSummaries(),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <ArticleUploadForm
      key={article.slug}
      variant="edit"
      initialArticle={article}
      posts={posts
        .filter((post) => post.slug !== article.slug)
        .map(({ slug: postSlug, title }) => ({
          slug: postSlug,
          title,
        }))}
    />
  );
}
