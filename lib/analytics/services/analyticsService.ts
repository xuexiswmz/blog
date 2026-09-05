import { getPostTitleMap } from "@/lib/posts";
import { formatShanghaiDate } from "../range";
import type {
  AnalyticsOverview,
  AnalyticsPostMetric,
  AnalyticsRange,
  AnalyticsTrendPoint,
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
