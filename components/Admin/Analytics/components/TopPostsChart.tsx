"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AnalyticsPostMetric } from "../types/analytics";

const topPostsConfig = {
  pageViews: { label: "访问次数", color: "#0ea5e9" },
} satisfies ChartConfig;

type TopPostsChartProps = {
  topPosts: AnalyticsPostMetric[];
};

function getPostLabel(post: AnalyticsPostMetric) {
  return post.title ?? `${post.postSlug}（文章不存在）`;
}

export default function TopPostsChart({ topPosts }: TopPostsChartProps) {
  const chartData = topPosts.slice(0, 10).map((post) => ({
    ...post,
    label: getPostLabel(post),
  }));
  const pageViewTotal = chartData.reduce(
    (total, post) => total + post.pageViews,
    0,
  );
  return (
    <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
      <div>
        <h2 className="text-lg font-semibold">热门文章</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          展示 {chartData.length} 篇文章，共 {pageViewTotal.toLocaleString("zh-CN")} 次浏览
        </p>
      </div>

      <ChartContainer
        config={topPostsConfig}
        className="mt-5 h-80 w-full aspect-auto"
      >
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 12, right: 12 }}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="label"
            type="category"
            tickLine={false}
            axisLine={false}
            width={112}
            tickFormatter={(value: string) =>
              value.length > 12 ? `${value.slice(0, 12)}…` : value
            }
          />
          <XAxis type="number" hide />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar
            dataKey="pageViews"
            fill="var(--color-pageViews)"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>

      <ol className="mt-4 space-y-2 text-sm">
        {chartData.map((post) => (
          <li key={post.postSlug} className="flex items-start justify-between gap-4">
            <span className="min-w-0 truncate" title={post.label}>
              {post.label}
            </span>
            <span className="shrink-0 text-gray-500 tabular-nums dark:text-gray-400">
              UV {post.uniqueVisitors.toLocaleString("zh-CN")} · PV{" "}
              {post.pageViews.toLocaleString("zh-CN")}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
