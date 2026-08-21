"use client";

import { useState } from "react";
import useCommentModeration from "../hooks/useCommentModeration";
import CommentDesktopTable from "./CommentDesktopTable";
import CommentMobileList from "./CommentMobileList";
import CommentDetailDialog from "./CommentDetailDialog";

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

  function openDetails(commentId: string) {
    setSelectedCommentId(commentId);
  }

  function closeDetails() {
    setSelectedCommentId(null);
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
            onViewDetails={openDetails}
          />

          <CommentMobileList
            comments={comments}
            reviewingId={reviewingId}
            onReview={reviewComment}
            onViewDetails={openDetails}
          />
        </>
      )}
      <CommentDetailDialog
        comment={selectedComment}
        reviewingId={reviewingId}
        onReview={reviewComment}
        onClose={closeDetails}
      />
    </section>
  );
}
