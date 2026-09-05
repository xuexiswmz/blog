import { describe, expect, it } from "vitest";
import { buildAnalyticsOverview } from "./analyticsService";

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
