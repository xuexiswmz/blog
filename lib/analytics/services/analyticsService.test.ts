import { describe, expect, it } from "vitest";
import {
  buildAnalyticsOverview,
  buildAnalyticsVisitorDetail,
  buildAnalyticsVisitorPage,
  getVisitorDisplayId,
} from "./analyticsService";

describe("buildAnalyticsOverview", () => {
  it("fills missing days and maps known post titles", () => {
    const overview = buildAnalyticsOverview({
      range: {
        key: "7d",
        start: new Date("2026-08-29T16:00:00.000Z"),
        end: new Date("2026-09-05T08:00:00.000Z"),
        timezone: "Asia/Shanghai",
      },
      summary: {
        uniqueVisitors: 2,
        pageViews: 3,
        visitedPosts: 1,
        returningVisitors: 1,
      },
      trendRows: [
        { date: "2026-09-01", uniqueVisitors: 2, pageViews: 3 },
      ],
      topPostRows: [
        { postSlug: "css-grid", uniqueVisitors: 2, pageViews: 3 },
      ],
      postTitles: new Map([["css-grid", "CSS Grid"]]),
    });

    expect(overview.trend).toHaveLength(7);
    expect(overview.trend[2]).toEqual({
      date: "2026-09-01",
      uniqueVisitors: 2,
      pageViews: 3,
    });
    expect(overview.topPosts[0]).toEqual({
      postSlug: "css-grid",
      title: "CSS Grid",
      uniqueVisitors: 2,
      pageViews: 3,
    });
  });

  it("fills missing dates for all-time data and keeps deleted titles null", () => {
    const overview = buildAnalyticsOverview({
      range: {
        key: "all",
        start: null,
        end: new Date("2026-09-05T08:00:00.000Z"),
        timezone: "Asia/Shanghai",
      },
      summary: {
        uniqueVisitors: 1,
        pageViews: 1,
        visitedPosts: 1,
        returningVisitors: 0,
      },
      trendRows: [
        { date: "2026-09-03", uniqueVisitors: 1, pageViews: 1 },
        { date: "2026-09-05", uniqueVisitors: 1, pageViews: 1 },
      ],
      topPostRows: [
        { postSlug: "removed", uniqueVisitors: 1, pageViews: 1 },
      ],
      postTitles: new Map(),
    });

    expect(overview.topPosts[0].title).toBeNull();
    expect(overview.trend).toEqual([
      { date: "2026-09-03", uniqueVisitors: 1, pageViews: 1 },
      { date: "2026-09-04", uniqueVisitors: 0, pageViews: 0 },
      { date: "2026-09-05", uniqueVisitors: 1, pageViews: 1 },
    ]);
  });
});

describe("visitor analytics builders", () => {
  it("maps visitor favorites and pagination", () => {
    const page = buildAnalyticsVisitorPage({
      page: 2,
      pageSize: 20,
      total: 41,
      visitorRows: [
        {
          visitorId: "11111111-1111-4111-8111-111111111111",
          firstVisitedAt: "2026-09-01T00:00:00.000Z",
          lastVisitedAt: "2026-09-05T00:00:00.000Z",
          pageViews: 5,
          visitedPosts: 2,
          favoritePostSlug: "css-grid",
          favoritePostViews: 3,
        },
      ],
      postTitles: new Map([["css-grid", "CSS Grid"]]),
    });

    expect(page.pagination).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
    expect(page.visitors[0]).toMatchObject({
      visitorId: "11111111-1111-4111-8111-111111111111",
      displayId: "访客 11111111",
      favoritePost: {
        postSlug: "css-grid",
        title: "CSS Grid",
        pageViews: 3,
      },
    });
  });

  it("uses anonymous display IDs and falls back to null for deleted titles", () => {
    expect(getVisitorDisplayId("11111111-1111-4111-8111-111111111111")).toBe(
      "访客 11111111",
    );

    const page = buildAnalyticsVisitorPage({
      page: 1,
      pageSize: 20,
      total: 1,
      visitorRows: [
        {
          visitorId: "11111111-1111-4111-8111-111111111111",
          firstVisitedAt: "2026-09-01T00:00:00.000Z",
          lastVisitedAt: "2026-09-05T00:00:00.000Z",
          pageViews: 1,
          visitedPosts: 1,
          favoritePostSlug: "deleted-post",
          favoritePostViews: 1,
        },
      ],
      postTitles: new Map(),
    });

    expect(page.visitors[0].favoritePost).toEqual({
      postSlug: "deleted-post",
      title: null,
      pageViews: 1,
    });
  });

  it("limits the visitor timeline to 100 records", () => {
    const visits = Array.from({ length: 120 }, (_, index) => ({
      postSlug: "css-grid",
      visitedAt: new Date(2026, 0, 1, 0, index).toISOString(),
    }));
    const detail = buildAnalyticsVisitorDetail({
      visitorId: "11111111-1111-4111-8111-111111111111",
      summary: {
        firstVisitedAt: visits[0].visitedAt,
        lastVisitedAt: visits[119].visitedAt,
        pageViews: 120,
        visitedPosts: 1,
      },
      postRows: [
        {
          postSlug: "css-grid",
          pageViews: 120,
          lastVisitedAt: visits[119].visitedAt,
        },
        {
          postSlug: "deleted-post",
          pageViews: 1,
          lastVisitedAt: visits[118].visitedAt,
        },
      ],
      recentVisitRows: visits.reverse(),
      postTitles: new Map([["css-grid", "CSS Grid"]]),
    });

    expect(detail.recentVisits).toHaveLength(100);
    expect(detail.posts).toEqual([
      {
        postSlug: "css-grid",
        title: "CSS Grid",
        pageViews: 120,
        lastVisitedAt: visits[0].visitedAt,
      },
      {
        postSlug: "deleted-post",
        title: null,
        pageViews: 1,
        lastVisitedAt: visits[1].visitedAt,
      },
    ]);
  });
});
