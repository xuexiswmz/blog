import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSession,
  getAnalyticsOverview,
  getAnalyticsVisitors,
  getAnalyticsVisitorDetail,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAnalyticsOverview: vi.fn(),
  getAnalyticsVisitors: vi.fn(),
  getAnalyticsVisitorDetail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/lib/analytics/services/analyticsService", () => ({
  getAnalyticsOverview,
  getAnalyticsVisitors,
  getAnalyticsVisitorDetail,
}));

import { GET as getOverview } from "./route";
import { GET as getVisitors } from "./visitors/route";
import { GET as getVisitorDetail } from "./visitors/[visitorId]/route";

const visitorId = "123e4567-e89b-42d3-a456-426614174000";

describe("admin analytics Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated overview request without caching it", async () => {
    getSession.mockResolvedValue(null);

    const response = await getOverview(
      new Request("http://localhost/api/admin/analytics?range=30d"),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      message: "请先登录管理员账号",
    });
  });

  it("returns 400 for an invalid range", async () => {
    getSession.mockResolvedValue({ user: { id: "admin" } });

    const response = await getOverview(
      new Request("http://localhost/api/admin/analytics?range=365d"),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getAnalyticsOverview).not.toHaveBeenCalled();
  });

  it("uses the default 30-day range for an overview", async () => {
    getSession.mockResolvedValue({ user: { id: "admin" } });
    getAnalyticsOverview.mockResolvedValue({ summary: { pageViews: 0 } });

    const response = await getOverview(
      new Request("http://localhost/api/admin/analytics"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getAnalyticsOverview).toHaveBeenCalledWith(
      expect.objectContaining({ key: "30d", timezone: "Asia/Shanghai" }),
    );
  });

  it("passes valid pagination to the visitor service", async () => {
    getSession.mockResolvedValue({ user: { id: "admin" } });
    getAnalyticsVisitors.mockResolvedValue({
      visitors: [],
      pagination: { page: 2, pageSize: 50, total: 0, totalPages: 0 },
    });

    const response = await getVisitors(
      new Request(
        "http://localhost/api/admin/analytics/visitors?range=90d&page=2&pageSize=50",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getAnalyticsVisitors).toHaveBeenCalledWith(
      expect.objectContaining({ key: "90d" }),
      2,
      50,
    );
  });

  it("uses the default range and pagination for visitors", async () => {
    getSession.mockResolvedValue({ user: { id: "admin" } });
    getAnalyticsVisitors.mockResolvedValue({
      visitors: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const response = await getVisitors(
      new Request("http://localhost/api/admin/analytics/visitors"),
    );

    expect(response.status).toBe(200);
    expect(getAnalyticsVisitors).toHaveBeenCalledWith(
      expect.objectContaining({ key: "30d" }),
      1,
      20,
    );
  });

  it("returns 400 for invalid visitor pagination", async () => {
    getSession.mockResolvedValue({ user: { id: "admin" } });

    const response = await getVisitors(
      new Request("http://localhost/api/admin/analytics/visitors?page=0"),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getAnalyticsVisitors).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid visitor UUID", async () => {
    getSession.mockResolvedValue({ user: { id: "admin" } });

    const response = await getVisitorDetail(new Request("http://localhost"), {
      params: Promise.resolve({ visitorId: "invalid" }),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 404 when the visitor has no record in the selected range", async () => {
    getSession.mockResolvedValue({ user: { id: "admin" } });
    getAnalyticsVisitorDetail.mockResolvedValue(null);

    const response = await getVisitorDetail(new Request("http://localhost"), {
      params: Promise.resolve({ visitorId }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      message: "访客记录不存在",
    });
  });
});
