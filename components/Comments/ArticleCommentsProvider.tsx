"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CommentCountsResponse } from "./types";

type ArticleCommentsContextValue = {
  postSlug: string;
  commentCounts: Record<string, number>;
  refreshCommentCounts: () => Promise<void>;
};

const ArticleCommentsContext =
  createContext<ArticleCommentsContextValue | null>(null);

type ArticleCommentsProviderProps = {
  postSlug: string;
  children: ReactNode;
};

async function requestCommentCounts(postSlug: string, signal?: AbortSignal) {
  const response = await fetch(
    `/api/posts/${encodeURIComponent(postSlug)}/comments/counts`,
    {
      method: "GET",
      cache: "no-cache",
      signal,
    },
  );

  const result = (await response.json()) as CommentCountsResponse & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(result.message ?? "获取段评数量失败");
  }

  return result.counts;
}

// 把文章slug提供给所有段评组件

function ArticleCommentsProvider({
  postSlug,
  children,
}: ArticleCommentsProviderProps) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    const controller = new AbortController();

    async function syncCommentCounts() {
      try {
        const counts = await requestCommentCounts(postSlug, controller.signal);

        setCommentCounts(counts);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("获取段评数量失败", error);
      }
    }

    void syncCommentCounts();

    return () => {
      controller.abort();
    };
  }, [postSlug]);

  const refreshCommentCounts = useCallback(async () => {
    try {
      const counts = await requestCommentCounts(postSlug);
      setCommentCounts(counts);
    } catch (error) {
      console.error("刷新段评数量失败", error);
    }
  }, [postSlug]);

  const contextValue = useMemo(
    () => ({ postSlug, commentCounts, refreshCommentCounts }),
    [postSlug, commentCounts, refreshCommentCounts],
  );

  return (
    <ArticleCommentsContext.Provider value={contextValue}>
      {children}
    </ArticleCommentsContext.Provider>
  );
}

export function useArticleComments() {
  const context = useContext(ArticleCommentsContext);
  if (!context) {
    throw new Error("useArticleComments 必须在 ArticleCommentsProvider 内使用");
  }
  return context;
}

export default ArticleCommentsProvider;
