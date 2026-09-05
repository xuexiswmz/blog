import { getPostTitleMap } from "@/lib/posts";
import { formatShanghaiDate } from "../range";
import type {
  AnalyticsOverview,
  AnalyticsPostMetric,
  AnalyticsRange,
  AnalyticsTrendPoint,
  AnalyticsVisitorDetail,
  AnalyticsVisitorPage,
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

type BuildOverviewInput = {
  range: AnalyticsRange;
  summary: AnalyticsOverview["summary"];
  trendRows: AnalyticsTrendPoint[];
  topPostRows: Array<Omit<AnalyticsPostMetric, "title">>;
  postTitles: Map<string, string>;
};

type OverviewSummaryRow = {
  unique_visitors: number | string;
  page_views: number | string;
  visited_posts: number | string;
  returning_visitors: number | string;
};

type OverviewTrendRow = {
  date: string;
  unique_visitors: number | string;
  page_views: number | string;
};

type TopPostRow = {
  post_slug: string;
  unique_visitors: number | string;
  page_views: number | string;
};

type BuildVisitorPageInput = {
  page: number;
  pageSize: number;
  total: number;
  visitorRows: Array<{
    visitorId: string;
    firstVisitedAt: string;
    lastVisitedAt: string;
    pageViews: number;
    visitedPosts: number;
    favoritePostSlug: string | null;
    favoritePostViews: number | null;
  }>;
  postTitles: Map<string, string>;
};

type BuildVisitorDetailInput = {
  visitorId: string;
  summary: {
    firstVisitedAt: string;
    lastVisitedAt: string;
    pageViews: number;
    visitedPosts: number;
  };
  postRows: Array<{
    postSlug: string;
    pageViews: number;
    lastVisitedAt: string;
  }>;
  recentVisitRows: Array<{
    postSlug: string;
    visitedAt: string;
  }>;
  postTitles: Map<string, string>;
};

function enumerateDateStrings(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    dates.push(new Date(time).toISOString().slice(0, 10));
  }

  return dates;
}

export function buildAnalyticsOverview(
  input: BuildOverviewInput,
): AnalyticsOverview {
  const trendByDate = new Map(input.trendRows.map((row) => [row.date, row]));
  const firstDate = input.range.start
    ? formatShanghaiDate(input.range.start)
    : input.trendRows[0]?.date ?? null;
  const dates = firstDate
    ? enumerateDateStrings(firstDate, formatShanghaiDate(input.range.end))
    : [];
  const trend = dates.map((date) => ({
    date,
    uniqueVisitors: trendByDate.get(date)?.uniqueVisitors ?? 0,
    pageViews: trendByDate.get(date)?.pageViews ?? 0,
  }));

  return {
    range: {
      key: input.range.key,
      start: input.range.start?.toISOString() ?? null,
      end: input.range.end.toISOString(),
      timezone: "Asia/Shanghai",
    },
    summary: input.summary,
    trend,
    topPosts: input.topPostRows.map((row) => ({
      ...row,
      title: input.postTitles.get(row.postSlug) ?? null,
    })),
  };
}

export async function getAnalyticsOverview(
  range: AnalyticsRange,
): Promise<AnalyticsOverview> {
  const { getOverviewSummary, getOverviewTrend, getTopPosts } = await import(
    "../repositories/articleVisitRepository"
  );
  const [summaryRow, trendRows, topPostRows, postTitles] = await Promise.all([
    getOverviewSummary(range),
    getOverviewTrend(range),
    getTopPosts(range),
    getPostTitleMap(),
  ]);

  const summary = summaryRow as OverviewSummaryRow;
  const trend = trendRows as OverviewTrendRow[];
  const topPosts = topPostRows as TopPostRow[];

  return buildAnalyticsOverview({
    range,
    summary: {
      uniqueVisitors: Number(summary.unique_visitors),
      pageViews: Number(summary.page_views),
      visitedPosts: Number(summary.visited_posts),
      returningVisitors: Number(summary.returning_visitors),
    },
    trendRows: trend.map((row) => ({
      date: row.date,
      uniqueVisitors: Number(row.unique_visitors),
      pageViews: Number(row.page_views),
    })),
    topPostRows: topPosts.map((row) => ({
      postSlug: row.post_slug,
      uniqueVisitors: Number(row.unique_visitors),
      pageViews: Number(row.page_views),
    })),
    postTitles,
  });
}

export function getVisitorDisplayId(visitorId: string): string {
  return `访客 ${visitorId.slice(0, 8)}`;
}

export function buildAnalyticsVisitorPage(
  input: BuildVisitorPageInput,
): AnalyticsVisitorPage {
  return {
    visitors: input.visitorRows.map((row) => ({
      visitorId: row.visitorId,
      displayId: getVisitorDisplayId(row.visitorId),
      firstVisitedAt: row.firstVisitedAt,
      lastVisitedAt: row.lastVisitedAt,
      pageViews: row.pageViews,
      visitedPosts: row.visitedPosts,
      favoritePost:
        row.favoritePostSlug === null || row.favoritePostViews === null
          ? null
          : {
              postSlug: row.favoritePostSlug,
              title: input.postTitles.get(row.favoritePostSlug) ?? null,
              pageViews: row.favoritePostViews,
            },
    })),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total: input.total,
      totalPages: input.total === 0 ? 0 : Math.ceil(input.total / input.pageSize),
    },
  };
}

export function buildAnalyticsVisitorDetail(
  input: BuildVisitorDetailInput,
): AnalyticsVisitorDetail {
  return {
    visitorId: input.visitorId,
    displayId: getVisitorDisplayId(input.visitorId),
    firstVisitedAt: input.summary.firstVisitedAt,
    lastVisitedAt: input.summary.lastVisitedAt,
    pageViews: input.summary.pageViews,
    visitedPosts: input.summary.visitedPosts,
    posts: input.postRows.map((row) => ({
      postSlug: row.postSlug,
      title: input.postTitles.get(row.postSlug) ?? null,
      pageViews: row.pageViews,
      lastVisitedAt: row.lastVisitedAt,
    })),
    recentVisits: input.recentVisitRows.slice(0, 100).map((row) => ({
      postSlug: row.postSlug,
      title: input.postTitles.get(row.postSlug) ?? null,
      visitedAt: row.visitedAt,
    })),
  };
}

export async function getAnalyticsVisitors(
  range: AnalyticsRange,
  page: number,
  pageSize: number,
): Promise<AnalyticsVisitorPage> {
  const { getVisitorCount, getVisitorPageRows } = await import(
    "../repositories/articleVisitRepository"
  );
  const offset = (page - 1) * pageSize;
  const [total, visitorRows, postTitles] = await Promise.all([
    getVisitorCount(range),
    getVisitorPageRows(range, pageSize, offset),
    getPostTitleMap(),
  ]);

  return buildAnalyticsVisitorPage({
    page,
    pageSize,
    total,
    visitorRows: visitorRows.map((row) => ({
      visitorId: row.visitor_id,
      firstVisitedAt: row.first_visited_at.toISOString(),
      lastVisitedAt: row.last_visited_at.toISOString(),
      pageViews: Number(row.page_views),
      visitedPosts: Number(row.visited_posts),
      favoritePostSlug: row.favorite_post_slug,
      favoritePostViews:
        row.favorite_post_views === null
          ? null
          : Number(row.favorite_post_views),
    })),
    postTitles,
  });
}

export async function getAnalyticsVisitorDetail(
  range: AnalyticsRange,
  visitorId: string,
): Promise<AnalyticsVisitorDetail | null> {
  const {
    getRecentVisitorRows,
    getVisitorPostRows,
    getVisitorSummary,
  } = await import("../repositories/articleVisitRepository");
  const summary = await getVisitorSummary(range, visitorId);

  if (summary === null) return null;

  const [postRows, recentVisitRows, postTitles] = await Promise.all([
    getVisitorPostRows(range, visitorId),
    getRecentVisitorRows(range, visitorId, 100),
    getPostTitleMap(),
  ]);

  return buildAnalyticsVisitorDetail({
    visitorId,
    summary: {
      firstVisitedAt: summary.first_visited_at.toISOString(),
      lastVisitedAt: summary.last_visited_at.toISOString(),
      pageViews: Number(summary.page_views),
      visitedPosts: Number(summary.visited_posts),
    },
    postRows: postRows.map((row) => ({
      postSlug: row.post_slug,
      pageViews: Number(row.page_views),
      lastVisitedAt: row.last_visited_at.toISOString(),
    })),
    recentVisitRows: recentVisitRows.map((row) => ({
      postSlug: row.post_slug,
      visitedAt: row.visited_at.toISOString(),
    })),
    postTitles,
  });
}
