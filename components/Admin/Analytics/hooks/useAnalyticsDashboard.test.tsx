// @vitest-environment jsdom

import {
  act,
  createRef,
  forwardRef,
  useImperativeHandle,
  type RefObject,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AnalyticsOverview,
  AnalyticsVisitorDetail,
  AnalyticsVisitorPage,
} from "../types/analytics";

const mocks = vi.hoisted(() => {
  const replace = vi.fn();
  return {
    replace,
    router: { replace },
    requestOverview: vi.fn(),
    requestVisitors: vi.fn(),
    requestVisitorDetail: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("../api/analyticsApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../api/analyticsApi")>();
  return {
    ...actual,
    requestAnalyticsOverview: mocks.requestOverview,
    requestAnalyticsVisitors: mocks.requestVisitors,
    requestAnalyticsVisitorDetail: mocks.requestVisitorDetail,
  };
});

import { AnalyticsApiError } from "../api/analyticsApi";
import useAnalyticsDashboard from "./useAnalyticsDashboard";

const overviewFixture: AnalyticsOverview = {
  range: {
    key: "30d",
    start: "2026-08-06T16:00:00.000Z",
    end: "2026-09-05T08:00:00.000Z",
    timezone: "Asia/Shanghai",
  },
  summary: {
    uniqueVisitors: 1,
    pageViews: 2,
    visitedPosts: 1,
    returningVisitors: 1,
  },
  trend: [],
  topPosts: [],
};

const visitorPageFixture: AnalyticsVisitorPage = {
  visitors: [
    {
      visitorId: "11111111-1111-4111-8111-111111111111",
      displayId: "访客 11111111",
      firstVisitedAt: "2026-09-01T00:00:00.000Z",
      lastVisitedAt: "2026-09-05T00:00:00.000Z",
      pageViews: 2,
      visitedPosts: 1,
      favoritePost: null,
    },
  ],
  pagination: { page: 1, pageSize: 20, total: 41, totalPages: 3 },
};

const visitorDetailFixture: AnalyticsVisitorDetail = {
  visitorId: "11111111-1111-4111-8111-111111111111",
  displayId: "访客 11111111",
  firstVisitedAt: "2026-09-01T00:00:00.000Z",
  lastVisitedAt: "2026-09-05T00:00:00.000Z",
  pageViews: 2,
  visitedPosts: 1,
  posts: [],
  recentVisits: [],
};

type DashboardState = ReturnType<typeof useAnalyticsDashboard>;

let container: HTMLDivElement;
let root: Root;
let dashboardRef: RefObject<DashboardState | null>;

const HookHarness = forwardRef<DashboardState>(function HookHarness(_props, ref) {
  const dashboard = useAnalyticsDashboard();
  useImperativeHandle(ref, () => dashboard, [dashboard]);
  return null;
});

function getDashboard() {
  if (!dashboardRef.current) {
    throw new Error("dashboard hook is not mounted");
  }
  return dashboardRef.current;
}

async function renderHook() {
  await act(async () => {
    root.render(<HookHarness ref={dashboardRef} />);
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

async function update(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT: boolean;
    }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  mocks.replace.mockReset();
  mocks.requestOverview.mockReset().mockResolvedValue(overviewFixture);
  mocks.requestVisitors.mockReset().mockResolvedValue(visitorPageFixture);
  mocks.requestVisitorDetail
    .mockReset()
    .mockResolvedValue(visitorDetailFixture);

  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  dashboardRef = createRef<DashboardState>();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("useAnalyticsDashboard", () => {
  it("keeps the successful visitor page visible while the next page loads", async () => {
    await renderHook();
    const firstPage = getDashboard().visitorPage;
    let resolveNextPage!: (page: AnalyticsVisitorPage) => void;
    const nextPagePromise = new Promise<AnalyticsVisitorPage>((resolve) => {
      resolveNextPage = resolve;
    });
    mocks.requestVisitors.mockReturnValueOnce(nextPagePromise);

    await act(async () => {
      getDashboard().setPage(2);
      await Promise.resolve();
    });

    expect(getDashboard().page).toBe(2);
    expect(getDashboard().visitorsLoading).toBe(true);
    expect(getDashboard().visitorPage).toBe(firstPage);

    await act(async () => {
      resolveNextPage({
        visitors: [],
        pagination: { page: 2, pageSize: 20, total: 41, totalPages: 3 },
      });
      await nextPagePromise;
    });
    expect(getDashboard().visitorPage?.pagination.page).toBe(2);
  });

  it("clears visitor selection and detail on page and range changes", async () => {
    await renderHook();

    await update(() =>
      getDashboard().selectVisitor("11111111-1111-4111-8111-111111111111"),
    );
    expect(getDashboard().visitorDetail).toEqual(visitorDetailFixture);

    await update(() => getDashboard().setPage(2));
    expect(getDashboard().selectedVisitorId).toBeNull();
    expect(getDashboard().visitorDetail).toBeNull();

    await update(() =>
      getDashboard().selectVisitor("11111111-1111-4111-8111-111111111111"),
    );
    await update(() => getDashboard().setRange("7d"));
    expect(getDashboard().range).toBe("7d");
    expect(getDashboard().page).toBe(1);
    expect(getDashboard().selectedVisitorId).toBeNull();
    expect(getDashboard().visitorDetail).toBeNull();
  });

  it("retries overview, visitor page, and detail independently", async () => {
    await renderHook();
    mocks.requestOverview.mockClear();
    mocks.requestVisitors.mockClear();
    mocks.requestVisitorDetail.mockClear();

    await update(getDashboard().retryOverview);
    expect(mocks.requestOverview).toHaveBeenCalledTimes(1);
    expect(mocks.requestVisitors).not.toHaveBeenCalled();
    expect(mocks.requestVisitorDetail).not.toHaveBeenCalled();

    mocks.requestOverview.mockClear();
    await update(getDashboard().retryVisitors);
    expect(mocks.requestVisitors).toHaveBeenCalledTimes(1);
    expect(mocks.requestOverview).not.toHaveBeenCalled();
    expect(mocks.requestVisitorDetail).not.toHaveBeenCalled();

    await update(() =>
      getDashboard().selectVisitor("11111111-1111-4111-8111-111111111111"),
    );
    mocks.requestOverview.mockClear();
    mocks.requestVisitors.mockClear();
    mocks.requestVisitorDetail.mockClear();

    await update(getDashboard().retryVisitorDetail);
    expect(mocks.requestVisitorDetail).toHaveBeenCalledTimes(1);
    expect(mocks.requestOverview).not.toHaveBeenCalled();
    expect(mocks.requestVisitors).not.toHaveBeenCalled();
  });

  it("redirects to login when the visitor page request returns 401", async () => {
    mocks.requestVisitors.mockRejectedValueOnce(
      new AnalyticsApiError("请先登录管理员账号", 401),
    );

    await renderHook();

    expect(mocks.replace).toHaveBeenCalledWith("/admin/login");
  });

  it("redirects to login when the visitor detail request returns 401", async () => {
    await renderHook();
    mocks.requestVisitorDetail.mockRejectedValueOnce(
      new AnalyticsApiError("请先登录管理员账号", 401),
    );

    await update(() =>
      getDashboard().selectVisitor("11111111-1111-4111-8111-111111111111"),
    );

    expect(mocks.replace).toHaveBeenCalledWith("/admin/login");
  });
});
