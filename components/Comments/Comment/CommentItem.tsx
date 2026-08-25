"use client";

import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import MarkdownContent from "../Markdown/MarkdownContent";
import { ParagraphComment } from "./types";

type CommentItemProps = {
  comment: ParagraphComment;
  onReply?: (comment: ParagraphComment) => void;
  onDelete?: (commentId: string) => void;
  deleting?: boolean;

  replyCount?: number;
  repliesCollapsed?: boolean;
  repliesId?: string;
  onToggleReplies?: () => void;
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function CommentItem({
  comment,
  onReply,
  onDelete,
  deleting = false,
  replyCount = 0,
  repliesCollapsed = false,
  repliesId,
  onToggleReplies,
}: CommentItemProps) {
  const avatarText =
    Array.from(comment.username.trim())[0]?.toUpperCase() ?? "?";

  const canReply = !comment.deleted && Boolean(onReply);

  const canDelete = !comment.deleted && comment.canDelete && Boolean(onDelete);

  const canToggleReplies =
    replyCount > 0 && Boolean(repliesId) && Boolean(onToggleReplies);

  const hasActions = canReply || canDelete || canToggleReplies;

  return (
    <article className="flex gap-3 px-4 py-3 transition-colors hover:bg-black/2 dark:hover:bg-white/3">
      <div
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200"
      >
        {avatarText}
      </div>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-x-2">
          <span className="font-semibold text-slate-950 dark:text-slate-100">
            {comment.username}
          </span>

          <time
            dateTime={comment.createdAt}
            className=" text-sm text-slate-500 dark:text-slate-400"
          >
            {dateFormatter.format(new Date(comment.createdAt))}
          </time>
        </header>

        {comment.replyToUsername && (
          <p className=" mt-1 text-sm text-slate-500 dark:text-slate-400">
            回复{" "}
            <span className="text-sky-500">@{comment.replyToUsername}</span>
          </p>
        )}

        <div className="mt-1 text-[15px] leading-6">
          <MarkdownContent content={comment.content} />
        </div>

        {hasActions && (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {canReply && (
              <button
                type="button"
                aria-label={`回复 ${comment.username}`}
                onClick={() => onReply?.(comment)}
                className="
                  group inline-flex items-center gap-1
                  text-sm text-slate-500
                  transition-colors
                  hover:text-sky-500
                  dark:text-slate-400
                  dark:hover:text-sky-400
                "
              >
                <span className="rounded-full p-2 transition-colors group-hover:bg-sky-500/10">
                  <MessageCircle className="size-4" />
                </span>

                <span>回复</span>
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => onDelete?.(comment.id)}
                className="
                  text-sm text-slate-500
                  transition-colors
                  hover:text-red-500
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:text-slate-400
                  dark:hover:text-red-400
                "
              >
                {deleting ? "删除中" : "删除"}
              </button>
            )}

            {canToggleReplies && (
              <button
                type="button"
                aria-expanded={!repliesCollapsed}
                aria-controls={repliesId}
                onClick={onToggleReplies}
                className="
          group inline-flex items-center gap-1
          text-sm text-slate-500
          transition-colors
          hover:text-sky-500
          dark:text-slate-400
          dark:hover:text-sky-400
        "
              >
                <span className="rounded-full p-2 transition-colors group-hover:bg-sky-500/10">
                  {repliesCollapsed ? (
                    <ChevronDown aria-hidden="true" className="size-4" />
                  ) : (
                    <ChevronUp aria-hidden="true" className="size-4" />
                  )}
                </span>

                <span>
                  {repliesCollapsed ? `展开 ${replyCount} 条回复` : "收起回复"}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
