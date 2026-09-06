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
  it("does not expose stale pagination during a failed page transition", async () => {
    await renderHook();
    let rejectNextPage!: (error: Error) => void;
    const nextPagePromise = new Promise<AnalyticsVisitorPage>((_resolve, reject) => {
      rejectNextPage = reject;
    });
    mocks.requestVisitors.mockReturnValueOnce(nextPagePromise);

    await act(async () => {
      getDashboard().setPage(2);
      await Promise.resolve();
    });

    expect(getDashboard().page).toBe(2);
    expect(getDashboard().visitorsLoading).toBe(true);
    expect(getDashboard().visitorPage).toBeNull();

    await act(async () => {
      rejectNextPage(new Error("读取访客列表失败"));
      await nextPagePromise.catch(() => undefined);
    });
    expect(getDashboard().visitorPage).toBeNull();
    expect(getDashboard().visitorsError).toBe("读取访客列表失败");
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

  it("aborts a stale visitor page request and ignores its late result", async () => {
    await renderHook();
    let resolvePageTwo!: (page: AnalyticsVisitorPage) => void;
    let resolvePageThree!: (page: AnalyticsVisitorPage) => void;
    const pageTwoPromise = new Promise<AnalyticsVisitorPage>((resolve) => {
      resolvePageTwo = resolve;
    });
    const pageThreePromise = new Promise<AnalyticsVisitorPage>((resolve) => {
      resolvePageThree = resolve;
    });
    mocks.requestVisitors.mockClear();
    mocks.requestVisitors
      .mockReturnValueOnce(pageTwoPromise)
      .mockReturnValueOnce(pageThreePromise);

    await act(async () => {
      getDashboard().setPage(2);
      await Promise.resolve();
    });
    const pageTwoSignal = mocks.requestVisitors.mock.calls[0][3] as AbortSignal;
    expect(pageTwoSignal.aborted).toBe(false);

    await act(async () => {
      getDashboard().setPage(3);
      await Promise.resolve();
    });
    expect(pageTwoSignal.aborted).toBe(true);

    await act(async () => {
      resolvePageThree({
        visitors: [],
        pagination: { page: 3, pageSize: 20, total: 41, totalPages: 3 },
      });
      await pageThreePromise;
    });
    await act(async () => {
      resolvePageTwo({
        visitors: [],
        pagination: { page: 2, pageSize: 20, total: 41, totalPages: 3 },
      });
      await pageTwoPromise;
    });

    expect(getDashboard().visitorPage?.pagination.page).toBe(3);
  });

  it("aborts a stale detail request and ignores its late result", async () => {
    await renderHook();
    let resolveFirstDetail!: (detail: AnalyticsVisitorDetail) => void;
    let resolveSecondDetail!: (detail: AnalyticsVisitorDetail) => void;
    const firstDetailPromise = new Promise<AnalyticsVisitorDetail>((resolve) => {
      resolveFirstDetail = resolve;
    });
    const secondDetailPromise = new Promise<AnalyticsVisitorDetail>((resolve) => {
      resolveSecondDetail = resolve;
    });
    mocks.requestVisitorDetail
      .mockReset()
      .mockReturnValueOnce(firstDetailPromise)
      .mockReturnValueOnce(secondDetailPromise);

    await act(async () => {
      getDashboard().selectVisitor(
        "11111111-1111-4111-8111-111111111111",
      );
      await Promise.resolve();
    });
    const firstDetailSignal = mocks.requestVisitorDetail.mock.calls[0][2] as
      | AbortSignal
      | undefined;
    expect(firstDetailSignal?.aborted).toBe(false);

    await act(async () => {
      getDashboard().selectVisitor(
        "22222222-2222-4222-8222-222222222222",
      );
      await Promise.resolve();
    });
    expect(firstDetailSignal?.aborted).toBe(true);

    const secondDetail: AnalyticsVisitorDetail = {
      ...visitorDetailFixture,
      visitorId: "22222222-2222-4222-8222-222222222222",
      displayId: "访客 22222222",
    };
    await act(async () => {
      resolveSecondDetail(secondDetail);
      await secondDetailPromise;
    });
    await act(async () => {
      resolveFirstDetail(visitorDetailFixture);
      await firstDetailPromise;
    });

    expect(getDashboard().visitorDetail).toEqual(secondDetail);
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
