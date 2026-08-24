"use client";

import { useEffect, useState } from "react";
import { CommentListResponse, ParagraphComment } from "./types";
import CommentItem from "./CommentItem";
import { toast } from "sonner";

type CommentListProps = {
  postSlug: string;
  paragraphId: string;
  onReply?: (comment: ParagraphComment) => void;
  onCountChange?: (count: number) => void;
  refreshKey: number;
  onDeleted?: () => void;
};

function CommentList({
  postSlug,
  paragraphId,
  onReply,
  onCountChange,
  refreshKey,
  onDeleted,
}: CommentListProps) {
  const [data, setData] = useState<CommentListResponse>({
    comments: [],
    count: 0,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadComments() {
      try {
        setLoading(true);
        setError("");

        const searchParams = new URLSearchParams({
          blockId: paragraphId,
        });

        const response = await fetch(
          `/api/posts/${encodeURIComponent(postSlug)}/comments?${searchParams}`,
          {
            method: "GET",
            cache: "no-cache",
            signal: controller.signal,
          },
        );

        const result = (await response.json()) as CommentListResponse & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(result.message ?? "获取评论失败");
        }
        setData(result);
        onCountChange?.(result.count);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setError(error instanceof Error ? error.message : "获取评论失败");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadComments();

    return () => {
      controller.abort();
    };
  }, [postSlug, paragraphId, refreshKey, onCountChange]);

  if (loading) {
    return <p className="text-sm text-gray-500">正在加载评论...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (data.comments.length === 0) {
    return <p className="text-sm text-gray-500">这个段落还没有评论</p>;
  }

  async function handleDelete(commentId: string) {
    const confirmed = window.confirm("确定删除这条评论吗");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(commentId);

      const response = await fetch(
        `/api/posts/${encodeURIComponent(postSlug)}/comments/${encodeURIComponent(commentId)}`,
        {
          method: "DELETE",
        },
      );

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "删除评论失败");
      }

      toast.success(result.message ?? "评论已删除");
      onDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除评论失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {data.comments.map((comment) => (
        <section key={comment.id}>
          <CommentItem
            comment={comment}
            onReply={onReply}
            onDelete={handleDelete}
            deleting={deletingId === comment.id}
          />

          {comment.replies.length > 0 && (
            <div className="ml-9 divide-y divide-slate-200 border-l border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onDelete={handleDelete}
                  deleting={deletingId === reply.id}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

export default CommentList;
