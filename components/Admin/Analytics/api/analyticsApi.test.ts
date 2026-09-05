import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  AnalyticsOverview,
  AnalyticsVisitorDetail,
  AnalyticsVisitorPage,
} from "../types/analytics";
import {
  requestAnalyticsOverview,
  requestAnalyticsVisitorDetail,
  requestAnalyticsVisitors,
} from "./analyticsApi";

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

const visitorPageFixture: AnalyticsVisitorPage = {
  visitors: [],
  pagination: { page: 2, pageSize: 25, total: 0, totalPages: 0 },
};

const visitorDetailFixture: AnalyticsVisitorDetail = {
  visitorId: "visitor/with space",
  displayId: "visitor/w",
  firstVisitedAt: "2026-09-01T08:00:00.000Z",
  lastVisitedAt: "2026-09-05T08:00:00.000Z",
  pageViews: 3,
  visitedPosts: 1,
  posts: [],
  recentVisits: [],
};

afterEach(() => vi.unstubAllGlobals());

describe("analyticsApi", () => {
  it("loads the 30-day overview without caching", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(overviewFixture), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(requestAnalyticsOverview("30d")).resolves.toEqual(
      overviewFixture,
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/analytics?range=30d",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("encodes visitor pagination parameters and disables caching", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(visitorPageFixture), { status: 200 }),
      ),
    );

    await expect(requestAnalyticsVisitors("90d", 2, 25)).resolves.toEqual(
      visitorPageFixture,
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/analytics/visitors?range=90d&page=2&pageSize=25",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("encodes visitor ids and range parameters for detail requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(visitorDetailFixture), { status: 200 }),
      ),
    );

    await expect(
      requestAnalyticsVisitorDetail("visitor/with space", "all"),
    ).resolves.toEqual(visitorDetailFixture);
    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/analytics/visitors/visitor%2Fwith%20space?range=all",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("preserves the HTTP status on API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "请先登录管理员账号" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(requestAnalyticsOverview("30d")).rejects.toMatchObject({
      name: "AnalyticsApiError",
      status: 401,
      message: "请先登录管理员账号",
    });
  });

  it("reports invalid successful JSON responses as API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not json", { status: 200 })),
    );

    await expect(requestAnalyticsOverview("7d")).rejects.toMatchObject({
      name: "AnalyticsApiError",
      status: 200,
      message: "访问分析接口没有返回有效数据",
    });
  });
});
