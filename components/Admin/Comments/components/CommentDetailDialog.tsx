"use client";

import { useEffect } from "react";
import CommentActions from "./CommentActions";
import CommentDetailContent from "./CommentDetailContent";
import {
  PendingComment,
  ReviewCommentHandler,
} from "../types/commentModeration";

type CommentDetailDialogProps = {
  comment: PendingComment | null;
  reviewingId: string | null;
  onReview: ReviewCommentHandler;
  onClose: () => void;
};

export default function CommentDetailDialog({
  comment,
  reviewingId,
  onReview,
  onClose,
}: CommentDetailDialogProps) {
  useEffect(() => {
    if (!comment) {
      return;
    }
    const previousOverflow = document.body.style.overflow;

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [comment, onClose]);

  if (!comment) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comment-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-950 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="comment-detail-title"
              className="text-2xl font-semibold tracking-tight"
            >
              评论详情
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              查看评论内容和审核上下文
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm text-gray-500 hover:text-gray-950 hover:underline dark:hover:text-white"
          >
            关闭
          </button>
        </div>

        <CommentDetailContent comment={comment} />

        <div className="mt-6 flex flex-wrap justify-end gap-x-5 gap-y-2 border-t border-gray-200 pt-4 text-sm dark:border-gray-800">
          <CommentActions
            commentId={comment.id}
            disabled={reviewingId !== null}
            reviewing={reviewingId === comment.id}
            onReview={onReview}
            onClose={onClose}
            align="end"
          />
        </div>
      </div>
    </div>
  );
}
