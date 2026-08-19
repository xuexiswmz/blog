"use client";

import { useEffect, useState } from "react";
import { CommentListResponse, ParagraphComment } from "./types";
import CommentItem from "./CommentItem";

type CommentListProps = {
  postSlug: string;
  paragraphId: string;
  onReply?: (comment: ParagraphComment) => void;
  refreshKey: number;
};

function CommentList({
  postSlug,
  paragraphId,
  onReply,
  refreshKey,
}: CommentListProps) {
  const [data, setData] = useState<CommentListResponse>({
    comments: [],
    count: 0,
  });

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

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "获取评论失败");
        }
        setData(result);
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
  }, [postSlug, paragraphId, refreshKey]);

  if (loading) {
    return <p className="text-sm text-gray-500">正在加载评论...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  if (data.comments.length === 0) {
    return <p className="text-sm text-gray-500">这个段落还没有评论</p>;
  }

  return (
    <div className="">
      <div className="text-xs text-slate-500 border-slate-200 px-4 py-3 border-b dark:border-slate-800 dark:text-slate-400">
        共 {data.count} 条评论
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {data.comments.map((comment) => (
          <section key={comment.id}>
            <CommentItem comment={comment} onReply={onReply} />

            {comment.replies.length > 0 && (
              <div className=" ml-9 border-l border-slate-200 divide-y divide-slate-200 dark:border-slate-800 dark:divide-slate-800">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    onReply={onReply}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

export default CommentList;
