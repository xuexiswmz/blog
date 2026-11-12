import { getPostSummaries } from "@/lib/posts";
import ArticleUploadForm from "@/components/Admin/Articles/ArticleUploadForm";

export default async function AdminArticlesPage() {
  const posts = await getPostSummaries();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950 dark:text-neutral-100">
          文章管理
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          上传新文章并选择要关联的旧文章；提交后会 commit 到 GitHub，部署构建后生效。
        </p>
      </div>

      <ArticleUploadForm
        posts={posts.map(({ slug, title }) => ({ slug, title }))}
      />
    </div>
  );
}
