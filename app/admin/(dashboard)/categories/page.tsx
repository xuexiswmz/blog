import ArticleCategoryManager from "@/components/Admin/ArticleCategories/components/ArticleCategoryManager";

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950 dark:text-neutral-100">
          文章分类
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          每篇文章只属于一个分类；使用上下按钮调整公开文章导航顺序。
        </p>
      </div>
      <ArticleCategoryManager />
    </div>
  );
}
