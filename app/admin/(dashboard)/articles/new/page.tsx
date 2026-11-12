import { getPostSummaries } from "@/lib/posts";
import ArticleUploadForm from "@/components/Admin/Articles/ArticleUploadForm";

export default async function NewArticlePage() {
  const posts = await getPostSummaries();

  return (
    <ArticleUploadForm
      posts={posts.map(({ slug, title }) => ({ slug, title }))}
    />
  );
}
