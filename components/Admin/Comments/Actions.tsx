"use client";

import { ReviewCommentHandler } from "./types";

type CommentActionsProps = {
  commentId: string;
  disabled: boolean;
  reviewing: boolean;
  onReview: ReviewCommentHandler;
  onViewDetails?: () => void;
  onClose?: () => void;
  align?: "start" | "end";
};

export default function CommentActions({
  commentId,
  disabled,
  reviewing,
  onReview,
  onViewDetails,
  onClose,
  align = "end",
}: CommentActionsProps) {
  const alignmentClass = align === "start" ? "justify-start" : "justify-end";
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-sm ${alignmentClass}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => void onReview(commentId, "approve")}
        className="text-green-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-green-400 "
      >
        通过
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => void onReview(commentId, "reject")}
        className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 "
      >
        拒绝
      </button>
      {onViewDetails && (
        <button
          type="button"
          onClick={onViewDetails}
          className="text-blue-600 hover:underline dark:text-blue-400 "
        >
          查看详情
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gray-600 hover:underline dark:text-gray-300"
        >
          取消
        </button>
      )}
      {reviewing && <span className="text-xs text-gray-500">审核中...</span>}
    </div>
  );
}
