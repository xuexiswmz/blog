import Link from "next/link";
import { Plus } from "lucide-react";
import { getPostSummaries } from "@/lib/posts";
import ArticleAdminList from "@/components/Admin/Articles/ArticleAdminList";

export default async function AdminArticlesPage() {
  const posts = await getPostSummaries();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-950 dark:text-neutral-100">
            文章管理
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {posts.length} 篇文章
          </p>
        </div>

        <Link
          href="/admin/articles/new"
          className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          <Plus className="size-4" aria-hidden="true" />
          新建文章
        </Link>
      </div>

      <ArticleAdminList
        posts={posts.map(({ slug, title, date, tags }) => ({
          slug,
          title,
          date,
          tags,
        }))}
      />
    </div>
  );
}
