"use client";

import { useEffect } from "react";
import { type PendingComment, type ReviewCommentHandler } from "./types";
import Link from "next/link";
import CommentActions from "./Actions";
import {
  formatCommentDate,
  getCommentType,
  getModerationStatus,
} from "./utils";

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
            onClick={() => onClose()}
            className="shrink-0 text-sm text-gray-500 hover:text-gray-950 hover:underline dark:hover:text-white"
          >
            关闭
          </button>
        </div>

        <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              用户名
            </dt>
            <dd className="mt-1 wrap-break-words font-medium">
              {comment.username}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              时间
            </dt>
            <dd className="mt-1 text-gray-700 dark:text-gray-200">
              {formatCommentDate(comment.createdAt)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              类型
            </dt>
            <dd className="mt-2">
              <span className="inline-flex min-w-20 justify-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {getCommentType(comment.rootId)}
              </span>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              AI 状态
            </dt>
            <dd className="mt-2">
              <span
                className={
                  comment.moderationSource === "ai"
                    ? "inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    : "inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }
              >
                {getModerationStatus(comment.moderationSource)}
              </span>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              文章
            </dt>
            <dd className="mt-1">
              <Link
                href={`/posts/${comment.postSlug}`}
                target="_blank"
                rel="noreferrer"
                className="break-all text-blue-600 hover:underline dark:text-blue-400"
              >
                {comment.postSlug}
              </Link>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              段落
            </dt>
            <dd className="mt-1">
              <Link
                href={`/posts/${comment.postSlug}#${comment.blockId}`}
                target="_blank"
                rel="noreferrer"
                className="break-all text-blue-600 hover:underline dark:text-blue-400"
              >
                {comment.blockId}
              </Link>
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
              模型
            </dt>
            <dd className="mt-1 break-all text-gray-700 dark:text-gray-200">
              {comment.moderationModel ?? "未记录"}
            </dd>
          </div>
        </dl>

        <section className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
          <h3 className="text-sm font-semibold">评论内容</h3>
          <p className="mt-3 whitespace-pre-wrap wrap-break-words border-l-2 border-gray-300 pl-4 text-base leading-7 text-gray-800 dark:border-gray-700 dark:text-gray-100">
            {comment.content}
          </p>
        </section>

        <section className="mt-8 rounded-2xl bg-gray-50 p-5 dark:bg-gray-900/70">
          <h3 className="text-sm font-semibold">AI 审核说明</h3>
          <p className="mt-2 whitespace-pre-wrap wrap-break-words text-sm leading-6 text-gray-600 dark:text-gray-300">
            {comment.moderationReason ?? "没有提供审核原因"}
          </p>
        </section>

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
