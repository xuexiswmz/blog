import AnalyticsDashboard from "@/components/Admin/Analytics/components/AnalyticsDashboard";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-950 dark:text-neutral-100">
          访问分析
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          查看访问趋势、热门文章和访客详情。
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
