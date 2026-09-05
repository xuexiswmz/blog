import type { AnalyticsOverview } from "../types/analytics";

type AnalyticsSummaryCardsProps = {
  summary: AnalyticsOverview["summary"];
};

const summaryItems = [
  { key: "uniqueVisitors", label: "匿名访客", description: "去重访客数" },
  { key: "pageViews", label: "浏览量", description: "文章访问次数" },
  { key: "visitedPosts", label: "访问文章", description: "被访问的文章数" },
  { key: "returningVisitors", label: "回访访客", description: "多次到访的访客" },
] as const;

export default function AnalyticsSummaryCards({
  summary,
}: AnalyticsSummaryCardsProps) {
  return (
    <section aria-label="访问概览" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryItems.map((item) => (
        <article
          key={item.key}
          className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {item.label}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {summary[item.key].toLocaleString("zh-CN")}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {item.description}
          </p>
        </article>
      ))}
    </section>
  );
}
