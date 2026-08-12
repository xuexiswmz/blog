"use client";

import { useState } from "react";
import CommentDetailDialog from "./DetailDialog";
import CommentDesktopTable from "./DesktopTable";
import CommentMobileList from "./MobileList";
import useCommentModeration from "./hooks/useCommentModeration";

export default function CommentModerationList() {
  const { comments, loading, error, reviewingId, reviewComment } =
    useCommentModeration();

  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null,
  );

  const selectedComment =
    comments.find((comment) => comment.id === selectedCommentId) ?? null;

  if (loading) {
    return <p className="text-sm text-gray-500">正在加载待审核评论...</p>;
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-gray-500">共 {comments.length} 条待审核评论</p>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {comments.length === 0 ? (
        <div className="border-y border-gray-200 py-10 text-center text-sm text-gray-500 dark:border-gray-800">
          目前没有待审核评论
        </div>
      ) : (
        <>
          <CommentDesktopTable
            comments={comments}
            reviewingId={reviewingId}
            onReview={reviewComment}
            onViewDetails={(commentId) => setSelectedCommentId(commentId)}
          />

          <CommentMobileList
            comments={comments}
            reviewingId={reviewingId}
            onReview={reviewComment}
            onViewDetails={(commentId) => setSelectedCommentId(commentId)}
          />
        </>
      )}
      <CommentDetailDialog
        comment={selectedComment}
        reviewingId={reviewingId}
        onReview={reviewComment}
        onClose={() => setSelectedCommentId(null)}
      />
    </section>
  );
}
