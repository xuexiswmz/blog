"use client";

import type { ArticleCategoryAdminState } from "@/lib/articleCategories/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArticleCategoryApiError,
  requestArticleCategoryState,
  requestAssignArticleCategory,
  requestCreateArticleCategory,
  requestDeleteArticleCategory,
  requestMoveArticleCategory,
  requestMoveArticleInCategory,
  requestRenameArticleCategory,
} from "../api/articleCategoryApi";

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export default function useArticleCategories() {
  const router = useRouter();
  const [state, setState] = useState<ArticleCategoryAdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const mutationInFlight = useRef(false);

  const handleUnauthorized = useCallback(
    (requestError: unknown): boolean => {
      if (
        requestError instanceof ArticleCategoryApiError &&
        requestError.status === 401
      ) {
        router.replace("/admin/login");
        return true;
      }
      return false;
    },
    [router],
  );

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const nextState = await requestArticleCategoryState(controller.signal);
        if (!controller.signal.aborted) setState(nextState);
      } catch (requestError) {
        if (controller.signal.aborted || isAbortError(requestError)) return;
        if (handleUnauthorized(requestError)) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "读取文章分类失败",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [handleUnauthorized, requestVersion]);

  const retry = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  const mutate = useCallback(
    async (
      key: string,
      operation: () => Promise<void>,
      successMessage: string,
    ): Promise<boolean> => {
      if (mutationInFlight.current) {
        toast.error("请等待当前操作完成");
        return false;
      }
      mutationInFlight.current = true;
      setPendingKey(key);
      setError("");
      try {
        await operation();
        setState(await requestArticleCategoryState());
        toast.success(successMessage);
        return true;
      } catch (requestError) {
        if (handleUnauthorized(requestError)) return false;
        toast.error(
          requestError instanceof Error
            ? requestError.message
            : "文章分类操作失败",
        );
        return false;
      } finally {
        mutationInFlight.current = false;
        setPendingKey(null);
      }
    },
    [handleUnauthorized],
  );

  const createCategory = useCallback(
    (name: string) =>
      mutate(
        "category:create",
        () => requestCreateArticleCategory(name),
        "分类已创建",
      ),
    [mutate],
  );
  const renameCategory = useCallback(
    (categoryId: string, name: string) =>
      mutate(
        `category:${categoryId}:rename`,
        () => requestRenameArticleCategory(categoryId, name),
        "分类名称已更新",
      ),
    [mutate],
  );
  const deleteCategory = useCallback(
    (categoryId: string) =>
      mutate(
        `category:${categoryId}:delete`,
        () => requestDeleteArticleCategory(categoryId),
        "分类已删除",
      ),
    [mutate],
  );
  const moveCategory = useCallback(
    (categoryId: string, direction: "up" | "down") =>
      mutate(
        `category:${categoryId}:move`,
        () => requestMoveArticleCategory(categoryId, direction),
        "分类顺序已更新",
      ),
    [mutate],
  );
  const assignCategory = useCallback(
    (postSlug: string, categoryId: string | null) =>
      mutate(
        `post:${postSlug}:assign`,
        () => requestAssignArticleCategory(postSlug, categoryId),
        "文章分类已更新",
      ),
    [mutate],
  );
  const movePost = useCallback(
    (postSlug: string, direction: "up" | "down") =>
      mutate(
        `post:${postSlug}:move`,
        () => requestMoveArticleInCategory(postSlug, direction),
        "文章顺序已更新",
      ),
    [mutate],
  );

  return {
    state,
    loading,
    error,
    pendingKey,
    retry,
    createCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    assignCategory,
    movePost,
  };
}
