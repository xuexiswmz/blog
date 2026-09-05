import {
  ANALYTICS_RANGE_KEYS,
  type AnalyticsRange,
  type AnalyticsRangeKey,
} from "./types";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS: Record<Exclude<AnalyticsRangeKey, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "180d": 180,
};

function shanghaiDayStart(date: Date) {
  const shifted = new Date(date.getTime() + SHANGHAI_OFFSET_MS);
  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) - SHANGHAI_OFFSET_MS,
  );
}

export function parseAnalyticsRange(
  value: string | null,
  now = new Date(),
): AnalyticsRange | null {
  const key = (value ?? "30d") as AnalyticsRangeKey;

  if (!ANALYTICS_RANGE_KEYS.includes(key)) return null;
  if (key === "all") {
    return { key, start: null, end: now, timezone: "Asia/Shanghai" };
  }

  const start = new Date(
    shanghaiDayStart(now).getTime() - (RANGE_DAYS[key] - 1) * DAY_MS,
  );
  return { key, start, end: now, timezone: "Asia/Shanghai" };
}

export function parseAnalyticsPagination(
  pageValue: string | null,
  pageSizeValue: string | null,
) {
  const page = pageValue === null ? 1 : Number(pageValue);
  const requestedPageSize = pageSizeValue === null ? 20 : Number(pageSizeValue);

  if (!Number.isInteger(page) || page < 1) return null;
  if (!Number.isInteger(requestedPageSize) || requestedPageSize < 1) return null;

  return { page, pageSize: Math.min(requestedPageSize, 100) };
}

export function formatShanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
