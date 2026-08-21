"use client";
import { useRouter } from "next/navigation";
import {
  CommentModerationApiError,
  requestCommentReview,
  requestPendingComments,
} from "../api/commentModerationApi";
import { PendingComment, ReviewAction } from "../types/commentModeration";
import { useEffect, useState } from "react";

function isUnauthError(error: unknown) {
  return error instanceof CommentModerationApiError && error.status === 401;
}

/**
 * 管理评论审核页面的数据和交互状态。
 *
 * 负责：
 * - 加载待审核评论
 * - 保存加载和错误状态
 * - 提交人工审核结果
 * - 审核成功后更新本地列表
 * - 登录失效时跳转登录页面
 *
 * 实际网络请求由 commentModerationApi.ts 负责。
 */
export default function useCommentModeration() {
  const router = useRouter();
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadComments() {
      try {
        const data = await requestPendingComments(controller.signal);
        setComments(data.comments);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (isUnauthError(error)) {
          router.replace("/admin/login");
          return;
        }

        setError(error instanceof Error ? error.message : "读取待审核评论失败");
      } finally {
        // 已取消的旧请求不再修改当前页面的加载状态。
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void loadComments();
    return () => {
      // 组件卸载时终止未完成的请求
      controller.abort();
    };
  }, [router]);

  async function reviewComment(
    commentId: string,
    action: ReviewAction,
  ): Promise<void> {
    setReviewingId(commentId);
    setError("");

    try {
      await requestCommentReview(commentId, action);

      setComments((currentComments) =>
        currentComments.filter((comment) => comment.id !== commentId),
      );
    } catch (error) {
      if (isUnauthError(error)) {
        router.replace("/admin/login");
      }
    } finally {
      setReviewingId(null);
    }
  }

  return {
    comments,
    loading,
    error,
    reviewingId,
    reviewComment,
  };
}
