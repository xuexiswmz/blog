"use client";

import type { ReactNode } from "react";
import type { AnalyticsOverview, AnalyticsRangeKey } from "../types/analytics";
import useAnalyticsDashboard from "../hooks/useAnalyticsDashboard";
import AnalyticsSummaryCards from "./AnalyticsSummaryCards";
import TopPostsChart from "./TopPostsChart";
import VisitTrendChart from "./VisitTrendChart";
import VisitorDetailDrawer from "./VisitorDetailDrawer";
import { VisitorMonitorView } from "./VisitorMonitor";

const RANGE_OPTIONS: Array<{ value: AnalyticsRangeKey; label: string }> = [
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
  { value: "180d", label: "近 180 天" },
  { value: "all", label: "全部时间" },
];

type AnalyticsDashboardViewProps = {
  range: AnalyticsRangeKey;
  overview: AnalyticsOverview | null;
  overviewLoading: boolean;
  overviewError: string;
  onRangeChange: (range: AnalyticsRangeKey) => void;
  onRetryOverview: () => void;
  children?: ReactNode;
};

export function AnalyticsDashboardView({
  range,
  overview,
  overviewLoading,
  overviewError,
  onRangeChange,
  onRetryOverview,
  children,
}: AnalyticsDashboardViewProps) {
  const isEmpty =
    overview !== null &&
    overview.summary.pageViews === 0 &&
    overview.summary.uniqueVisitors === 0;

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">概览</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            查看匿名访客、浏览量和文章热度
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">时间范围</span>
          <select
            value={range}
            onChange={(event) =>
              onRangeChange(event.target.value as AnalyticsRangeKey)
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {overviewLoading ? (
        <div className="border-y border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-800">
          正在加载访问分析数据...
        </div>
      ) : overviewError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 p-5 text-sm text-red-600 dark:border-red-900 dark:text-red-400"
        >
          <p>{overviewError}</p>
          <button
            type="button"
            onClick={onRetryOverview}
            className="mt-3 rounded-md bg-gray-900 px-3 py-2 text-sm text-white dark:bg-white dark:text-gray-900"
          >
            重新加载
          </button>
        </div>
      ) : overview ? (
        <>
          <AnalyticsSummaryCards summary={overview.summary} />
          {isEmpty ? (
            <div className="border-y border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-800">
              当前时间范围内还没有访问数据
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              <VisitTrendChart trend={overview.trend} />
              <TopPostsChart topPosts={overview.topPosts} />
            </div>
          )}
        </>
      ) : null}

      {children}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const dashboard = useAnalyticsDashboard();
  const pagination = dashboard.visitorPage?.pagination ?? {
    page: dashboard.page,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  };

  return (
    <>
      <AnalyticsDashboardView
        range={dashboard.range}
        overview={dashboard.overview}
        overviewLoading={dashboard.overviewLoading}
        overviewError={dashboard.overviewError}
        onRangeChange={dashboard.setRange}
        onRetryOverview={dashboard.retryOverview}
      >
        <VisitorMonitorView
          visitors={dashboard.visitorPage?.visitors ?? []}
          pagination={pagination}
          loading={dashboard.visitorsLoading}
          error={dashboard.visitorsError}
          onSelectVisitor={dashboard.selectVisitor}
          onPageChange={dashboard.setPage}
          onRetry={dashboard.retryVisitors}
        />
      </AnalyticsDashboardView>

      {dashboard.selectedVisitorId ? (
        <VisitorDetailDrawer
          detail={dashboard.visitorDetail}
          loading={dashboard.visitorDetailLoading}
          error={dashboard.visitorDetailError}
          onClose={dashboard.closeVisitor}
          onRetry={dashboard.retryVisitorDetail}
        />
      ) : null}
    </>
  );
}
