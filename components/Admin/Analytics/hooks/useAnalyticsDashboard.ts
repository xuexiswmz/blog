"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AnalyticsApiError,
  requestAnalyticsOverview,
  requestAnalyticsVisitorDetail,
  requestAnalyticsVisitors,
} from "../api/analyticsApi";
import type {
  AnalyticsOverview,
  AnalyticsRangeKey,
  AnalyticsVisitorDetail,
  AnalyticsVisitorPage,
} from "../types/analytics";

const VISITOR_PAGE_SIZE = 20;

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export default function useAnalyticsDashboard() {
  const router = useRouter();
  const [range, setCurrentRange] = useState<AnalyticsRangeKey>("30d");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [page, setCurrentPage] = useState(1);
  const [visitorPageResult, setVisitorPageResult] = useState<{
    range: AnalyticsRangeKey;
    page: number;
    data: AnalyticsVisitorPage;
  } | null>(null);
  const [visitorsLoading, setVisitorsLoading] = useState(true);
  const [visitorsError, setVisitorsError] = useState("");
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [visitorDetail, setVisitorDetail] =
    useState<AnalyticsVisitorDetail | null>(null);
  const [visitorDetailLoading, setVisitorDetailLoading] = useState(false);
  const [visitorDetailError, setVisitorDetailError] = useState("");
  const [overviewRequestVersion, setOverviewRequestVersion] = useState(0);
  const [visitorsRequestVersion, setVisitorsRequestVersion] = useState(0);
  const [visitorDetailRequestVersion, setVisitorDetailRequestVersion] =
    useState(0);
  const visitorPage =
    visitorPageResult?.range === range && visitorPageResult.page === page
      ? visitorPageResult.data
      : null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadOverview() {
      setOverviewLoading(true);
      setOverviewError("");
      setOverview(null);

      try {
        const data = await requestAnalyticsOverview(range, controller.signal);
        if (!controller.signal.aborted) {
          setOverview(data);
        }
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;

        if (error instanceof AnalyticsApiError && error.status === 401) {
          router.replace("/admin/login");
          return;
        }

        setOverviewError(
          error instanceof Error ? error.message : "读取访问分析概览失败",
        );
      } finally {
        if (!controller.signal.aborted) {
          setOverviewLoading(false);
        }
      }
    }

    void loadOverview();
    return () => controller.abort();
  }, [overviewRequestVersion, range, router]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadVisitors() {
      setVisitorsLoading(true);
      setVisitorsError("");

      try {
        const data = await requestAnalyticsVisitors(
          range,
          page,
          VISITOR_PAGE_SIZE,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setVisitorPageResult({ range, page, data });
        }
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;

        if (error instanceof AnalyticsApiError && error.status === 401) {
          router.replace("/admin/login");
          return;
        }

        setVisitorsError(
          error instanceof Error ? error.message : "读取访客列表失败",
        );
      } finally {
        if (!controller.signal.aborted) {
          setVisitorsLoading(false);
        }
      }
    }

    void loadVisitors();
    return () => controller.abort();
  }, [page, range, router, visitorsRequestVersion]);

  useEffect(() => {
    if (!selectedVisitorId) return;

    const controller = new AbortController();
    const visitorId = selectedVisitorId;

    async function loadVisitorDetail() {
      setVisitorDetailLoading(true);
      setVisitorDetailError("");
      setVisitorDetail(null);

      try {
        const data = await requestAnalyticsVisitorDetail(
          visitorId,
          range,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setVisitorDetail(data);
        }
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;

        if (error instanceof AnalyticsApiError && error.status === 401) {
          router.replace("/admin/login");
          return;
        }

        setVisitorDetailError(
          error instanceof Error ? error.message : "读取访客详情失败",
        );
      } finally {
        if (!controller.signal.aborted) {
          setVisitorDetailLoading(false);
        }
      }
    }

    void loadVisitorDetail();
    return () => controller.abort();
  }, [
    range,
    router,
    selectedVisitorId,
    visitorDetailRequestVersion,
  ]);

  const setRange = useCallback((nextRange: AnalyticsRangeKey) => {
    setCurrentRange(nextRange);
    setCurrentPage(1);
    setVisitorsLoading(true);
    setVisitorsError("");
    setSelectedVisitorId(null);
    setVisitorDetail(null);
    setVisitorDetailLoading(false);
    setVisitorDetailError("");
  }, []);

  const setPage = useCallback((nextPage: number) => {
    setCurrentPage(nextPage);
    setVisitorsLoading(true);
    setVisitorsError("");
    setSelectedVisitorId(null);
    setVisitorDetail(null);
    setVisitorDetailLoading(false);
    setVisitorDetailError("");
  }, []);

  const selectVisitor = useCallback((visitorId: string) => {
    setVisitorDetail(null);
    setVisitorDetailLoading(true);
    setVisitorDetailError("");
    setSelectedVisitorId(visitorId);
  }, []);

  const closeVisitor = useCallback(() => {
    setSelectedVisitorId(null);
    setVisitorDetail(null);
    setVisitorDetailLoading(false);
    setVisitorDetailError("");
  }, []);

  const retryOverview = useCallback(() => {
    setOverviewRequestVersion((version) => version + 1);
  }, []);

  const retryVisitors = useCallback(() => {
    setVisitorsRequestVersion((version) => version + 1);
  }, []);

  const retryVisitorDetail = useCallback(() => {
    setVisitorDetailRequestVersion((version) => version + 1);
  }, []);

  return {
    range,
    overview,
    overviewLoading,
    overviewError,
    page,
    visitorPage,
    visitorsLoading,
    visitorsError,
    selectedVisitorId,
    visitorDetail,
    visitorDetailLoading,
    visitorDetailError,
    setRange,
    setPage,
    selectVisitor,
    closeVisitor,
    retryOverview,
    retryVisitors,
    retryVisitorDetail,
  };
}
