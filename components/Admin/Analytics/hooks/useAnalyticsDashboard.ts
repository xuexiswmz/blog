"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AnalyticsApiError,
  requestAnalyticsOverview,
} from "../api/analyticsApi";
import type { AnalyticsOverview, AnalyticsRangeKey } from "../types/analytics";

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export default function useAnalyticsDashboard() {
  const router = useRouter();
  const [range, setCurrentRange] = useState<AnalyticsRangeKey>("30d");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [page, setPage] = useState(1);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [overviewRequestVersion, setOverviewRequestVersion] = useState(0);

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

  const setRange = useCallback((nextRange: AnalyticsRangeKey) => {
    setCurrentRange(nextRange);
    setPage(1);
    setSelectedVisitorId(null);
  }, []);

  const selectVisitor = useCallback((visitorId: string) => {
    setSelectedVisitorId(visitorId);
  }, []);

  const closeVisitor = useCallback(() => {
    setSelectedVisitorId(null);
  }, []);

  const retryOverview = useCallback(() => {
    setOverviewRequestVersion((version) => version + 1);
  }, []);

  return {
    range,
    overview,
    overviewLoading,
    overviewError,
    page,
    selectedVisitorId,
    setRange,
    setPage,
    selectVisitor,
    closeVisitor,
    retryOverview,
  };
}
