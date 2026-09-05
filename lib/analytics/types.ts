export const ANALYTICS_RANGE_KEYS = ["7d", "30d", "90d", "180d", "all"] as const;
export type AnalyticsRangeKey = (typeof ANALYTICS_RANGE_KEYS)[number];

export type AnalyticsRange = {
  key: AnalyticsRangeKey;
  start: Date | null;
  end: Date;
  timezone: "Asia/Shanghai";
};

export type AnalyticsTrendPoint = {
  date: string;
  uniqueVisitors: number;
  pageViews: number;
};

export type AnalyticsPostMetric = {
  postSlug: string;
  title: string | null;
  uniqueVisitors: number;
  pageViews: number;
};

export type AnalyticsOverview = {
  range: {
    key: AnalyticsRangeKey;
    start: string | null;
    end: string;
    timezone: "Asia/Shanghai";
  };
  summary: {
    uniqueVisitors: number;
    pageViews: number;
    visitedPosts: number;
    returningVisitors: number;
  };
  trend: AnalyticsTrendPoint[];
  topPosts: AnalyticsPostMetric[];
};

export type AnalyticsVisitorListItem = {
  visitorId: string;
  displayId: string;
  firstVisitedAt: string;
  lastVisitedAt: string;
  pageViews: number;
  visitedPosts: number;
  favoritePost: {
    postSlug: string;
    title: string | null;
    pageViews: number;
  } | null;
};

export type AnalyticsVisitorPage = {
  visitors: AnalyticsVisitorListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AnalyticsVisitorDetail = {
  visitorId: string;
  displayId: string;
  firstVisitedAt: string;
  lastVisitedAt: string;
  pageViews: number;
  visitedPosts: number;
  posts: Array<{
    postSlug: string;
    title: string | null;
    pageViews: number;
    lastVisitedAt: string;
  }>;
  recentVisits: Array<{
    postSlug: string;
    title: string | null;
    visitedAt: string;
  }>;
};
