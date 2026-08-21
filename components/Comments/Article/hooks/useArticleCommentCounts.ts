"use client";

import { useCallback, useEffect, useState } from "react";
import { requestCommentCounts } from "../api/articleCommentsApi";

/**
 * 管理一篇文章的段评数量。
 *
 * 负责：
 * 1. 文章加载时获取所有段落的评论数量
 * 2. 文章切换时重新获取
 * 3. 评论发布后提供手动刷新方法
 */
export function useArticleCommentCounts(postSlug: string) {
  // key 是稳定段落 ID，value 是该段落当前公开的评论数量。
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadCommentCounts() {
      try {
        const counts = await requestCommentCounts(postSlug, controller.signal);
        setCommentCounts(counts);
      } catch (error) {
        // 文章切换或者组件卸载导致的取消请求不属于错误。
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("获取段评数量失败", error);
      }
    }

    void loadCommentCounts();

    return () => {
      // 防止旧文章的请求完成后覆盖新文章的数据。
      controller.abort();
    };
  }, [postSlug]);

  /**
   * 评论通过审核并发布后，主动获取最新数量。
   *
   * 使用 useCallback 保持函数引用稳定，
   * 避免 Context value 因函数引用变化而更新。
   */
  const refreshCommentCounts = useCallback(async () => {
    try {
      const counts = await requestCommentCounts(postSlug);
      setCommentCounts(counts);
    } catch (error) {
      console.error("刷新段评数据失败", error);
    }
  }, [postSlug]);

  return {
    commentCounts,
    refreshCommentCounts,
  };
}
