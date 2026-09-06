import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AnalyticsOverview, AnalyticsVisitorDetail } from "../types/analytics";
import { AnalyticsDashboardView } from "./AnalyticsDashboard";
import { VisitorDetailView } from "./VisitorDetailDrawer";
import { VisitorMonitorView } from "./VisitorMonitor";

const overviewFixture: AnalyticsOverview = {
  range: {
    key: "30d",
    start: "2026-08-06T16:00:00.000Z",
    end: "2026-09-05T08:00:00.000Z",
    timezone: "Asia/Shanghai",
  },
  summary: {
    uniqueVisitors: 12,
    pageViews: 30,
    visitedPosts: 4,
    returningVisitors: 5,
  },
  trend: [{ date: "2026-09-05", uniqueVisitors: 12, pageViews: 30 }],
  topPosts: [
    {
      postSlug: "css-grid",
      title: "CSS Grid",
      uniqueVisitors: 8,
      pageViews: 20,
    },
  ],
};

const emptyOverviewFixture: AnalyticsOverview = {
  ...overviewFixture,
  summary: {
    uniqueVisitors: 0,
    pageViews: 0,
    visitedPosts: 0,
    returningVisitors: 0,
  },
  trend: [],
  topPosts: [],
};

const deletedPostDetailFixture: AnalyticsVisitorDetail = {
  visitorId: "11111111-1111-4111-8111-111111111111",
  displayId: "访客 11111111",
  firstVisitedAt: "2026-09-01T00:00:00.000Z",
  lastVisitedAt: "2026-09-05T00:00:00.000Z",
  pageViews: 2,
  visitedPosts: 1,
  posts: [
    {
      postSlug: "removed-post",
      title: null,
      pageViews: 2,
      lastVisitedAt: "2026-09-05T00:00:00.000Z",
    },
  ],
  recentVisits: [
    {
      postSlug: "removed-post",
      title: null,
      visitedAt: "2026-09-05T00:00:00.000Z",
    },
  ],
};

const defaultProps = {
  range: "30d" as const,
  onRangeChange: () => undefined,
  onRetryOverview: () => undefined,
};

describe("AnalyticsDashboardView", () => {
  it("renders summary values, chart labels, and monitoring content", () => {
    const markup = renderToStaticMarkup(
      <AnalyticsDashboardView
        {...defaultProps}
        overview={overviewFixture}
        overviewLoading={false}
        overviewError=""
      >
        <div>visitor monitor</div>
      </AnalyticsDashboardView>,
    );

    expect(markup).toContain("匿名访客");
    expect(markup).toContain(">12<");
    expect(markup).toContain("浏览量");
    expect(markup).toContain(">30<");
    expect(markup).toContain("CSS Grid");
    expect(markup).toContain("访问趋势");
    expect(markup).toContain("热门文章");
    expect(markup).toContain("visitor monitor");
  });

  it("renders a clear empty state instead of empty charts", () => {
    const markup = renderToStaticMarkup(
      <AnalyticsDashboardView
        {...defaultProps}
        overview={emptyOverviewFixture}
        overviewLoading={false}
        overviewError=""
      >
        <div>visitor monitor</div>
      </AnalyticsDashboardView>,
    );

    expect(markup).toContain("匿名访客");
    expect(markup).toContain(">0<");
    expect(markup).toContain("当前时间范围内还没有访问数据");
    expect(markup).not.toContain("data-chart=");
  });

  it("renders a loading state before overview data arrives", () => {
    const markup = renderToStaticMarkup(
      <AnalyticsDashboardView
        {...defaultProps}
        overview={null}
        overviewLoading
        overviewError=""
      />,
    );

    expect(markup).toContain("正在加载访问分析数据...");
  });

  it("renders the API error and a retry action", () => {
    const markup = renderToStaticMarkup(
      <AnalyticsDashboardView
        {...defaultProps}
        overview={null}
        overviewLoading={false}
        overviewError="读取访问分析概览失败"
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("读取访问分析概览失败");
    expect(markup).toContain("重新加载");
  });

  it("offers every supported range with 30 days selected", () => {
    const markup = renderToStaticMarkup(
      <AnalyticsDashboardView
        {...defaultProps}
        overview={overviewFixture}
        overviewLoading={false}
        overviewError=""
      />,
    );

    expect(markup).toContain("近 7 天");
    expect(markup).toContain("近 30 天");
    expect(markup).toContain("近 90 天");
    expect(markup).toContain("近 180 天");
    expect(markup).toContain("全部时间");
    expect(markup).toContain('<option value="30d" selected="">');
  });
});

describe("visitor analytics views", () => {
  it("renders visitor monitoring data", () => {
    const markup = renderToStaticMarkup(
      <VisitorMonitorView
        visitors={[
          {
            visitorId: "11111111-1111-4111-8111-111111111111",
            displayId: "访客 11111111",
            firstVisitedAt: "2026-09-01T00:00:00.000Z",
            lastVisitedAt: "2026-09-05T00:00:00.000Z",
            pageViews: 5,
            visitedPosts: 2,
            favoritePost: {
              postSlug: "css-grid",
              title: "CSS Grid",
              pageViews: 3,
            },
          },
        ]}
        pagination={{ page: 1, pageSize: 20, total: 1, totalPages: 1 }}
        loading={false}
        error=""
        onSelectVisitor={() => undefined}
        onPageChange={() => undefined}
        onRetry={() => undefined}
      />,
    );

    expect(markup).toContain("访客 11111111");
    expect(markup).toContain("CSS Grid");
    expect(markup).toContain("5 次访问");
  });

  it("labels deleted articles by slug", () => {
    const markup = renderToStaticMarkup(
      <VisitorDetailView
        detail={deletedPostDetailFixture}
        onClose={() => undefined}
      />,
    );

    expect(markup).toContain("removed-post");
    expect(markup).toContain("文章不存在");
  });
});
