import type {
  AnalyticsOverview,
  AnalyticsRangeKey,
  AnalyticsVisitorDetail,
  AnalyticsVisitorPage,
} from "../types/analytics";

type ApiMessageResponse = {
  message?: string;
};

export class AnalyticsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AnalyticsApiError";
  }
}

async function readJson<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null) as Promise<T | null>;
}

async function requestJson<T>(
  url: string,
  fallbackMessage: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal,
  });
  const data = await readJson<T & ApiMessageResponse>(response);

  if (!response.ok) {
    throw new AnalyticsApiError(
      data?.message ?? fallbackMessage,
      response.status,
    );
  }

  if (!data) {
    throw new AnalyticsApiError(
      "访问分析接口没有返回有效数据",
      response.status,
    );
  }

  return data;
}

export function requestAnalyticsOverview(
  range: AnalyticsRangeKey,
  signal?: AbortSignal,
): Promise<AnalyticsOverview> {
  const searchParams = new URLSearchParams({ range });
  return requestJson(
    `/api/admin/analytics?${searchParams}`,
    "读取访问分析概览失败",
    signal,
  );
}

export function requestAnalyticsVisitors(
  range: AnalyticsRangeKey,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<AnalyticsVisitorPage> {
  const searchParams = new URLSearchParams({
    range,
    page: String(page),
    pageSize: String(pageSize),
  });
  return requestJson(
    `/api/admin/analytics/visitors?${searchParams}`,
    "读取访客列表失败",
    signal,
  );
}

export function requestAnalyticsVisitorDetail(
  visitorId: string,
  range: AnalyticsRangeKey,
  signal?: AbortSignal,
): Promise<AnalyticsVisitorDetail> {
  const searchParams = new URLSearchParams({ range });
  return requestJson(
    `/api/admin/analytics/visitors/${encodeURIComponent(visitorId)}?${searchParams}`,
    "读取访客详情失败",
    signal,
  );
}
