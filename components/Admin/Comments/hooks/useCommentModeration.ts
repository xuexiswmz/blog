"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type CommentsResponse,
  type PendingComment,
  type ReviewAction,
} from "../types";

export default function useCommentModeration() {
  const router = useRouter();
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      try {
        const response = await fetch("/api/admin/comments", {
          cache: "no-store",
        });
        const data = (await response
          .json()
          .catch(() => null)) as CommentsResponse | null;

        if (response.status === 401) {
          router.replace("/admin/login");
          return;
        }

        if (!response.ok) {
          throw new Error(data?.message ?? "读取待审核评论失败");
        }

        if (!cancelled && data) {
          setComments(data.comments);
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error ? error.message : "读取待审核评论失败",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadComments();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function reviewComment(
    commentId: string,
    action: ReviewAction,
  ): Promise<void> {
    setReviewingId(commentId);
    setError("");

    try {
      const response = await fetch("/api/admin/comments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId,
          action,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!response.ok) {
        throw new Error(data?.message ?? "审核评论失败");
      }

      setComments((currentComments) =>
        currentComments.filter((comment) => comment.id !== commentId),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "审核评论失败");
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
