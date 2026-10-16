import ArticleCategoryManager from "@/components/Admin/ArticleCategories/components/ArticleCategoryManager";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminCategoriesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">
        返回管理中心
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">文章分类</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        每篇文章只属于一个分类；使用上下按钮调整公开文章导航顺序。
      </p>
      <ArticleCategoryManager />
    </main>
  );
}
