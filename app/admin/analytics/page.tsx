import AnalyticsDashboard from "@/components/Admin/Analytics/components/AnalyticsDashboard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminAnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">
        返回管理中心
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">访问分析</h1>
      <AnalyticsDashboard />
    </main>
  );
}
