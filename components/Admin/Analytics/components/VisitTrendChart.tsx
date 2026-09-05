"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AnalyticsTrendPoint } from "../types/analytics";

const trendConfig = {
  uniqueVisitors: { label: "UV", color: "#0ea5e9" },
  pageViews: { label: "PV", color: "#8b5cf6" },
} satisfies ChartConfig;

type VisitTrendChartProps = {
  trend: AnalyticsTrendPoint[];
};

export default function VisitTrendChart({ trend }: VisitTrendChartProps) {
  const pageViewTotal = trend.reduce((total, point) => total + point.pageViews, 0);

  return (
    <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
      <div>
        <h2 className="text-lg font-semibold">访问趋势</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          共 {trend.length} 天，累计 {pageViewTotal.toLocaleString("zh-CN")} 次浏览
        </p>
      </div>

      <ChartContainer config={trendConfig} className="mt-5 h-72 w-full aspect-auto">
        <LineChart data={trend} margin={{ left: 4, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={36} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            dataKey="uniqueVisitors"
            type="monotone"
            stroke="var(--color-uniqueVisitors)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="pageViews"
            type="monotone"
            stroke="var(--color-pageViews)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </section>
  );
}
