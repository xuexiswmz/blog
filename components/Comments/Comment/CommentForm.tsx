"use client";

import { type SubmitEvent, useId, useState } from "react";
import { type CommentSubmitResponse, type ParagraphComment } from "./types";
import { toast } from "sonner";
import MarkdownEditor from "../Markdown/MarkdownEditor";
import { useGuestUsername } from "./hooks/useGuestUsername";

type CommentsFormProps = {
  postSlug: string;
  paragraphId: string;
  replyTarget: ParagraphComment | null;
  onPublished: () => void;
  onSubmitted?: () => void;
};

function CommentForm({
  postSlug,
  paragraphId,
  replyTarget,
  onPublished,
  onSubmitted,
}: CommentsFormProps) {
  const contentId = useId();
  const username = useGuestUsername();

  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const contentLength = [...content.trim()].length;

  const canSubmit =
    username.length > 0 &&
    contentLength >= 1 &&
    contentLength <= 1000 &&
    !submitting;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `/api/posts/${encodeURIComponent(postSlug)}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            blockId: paragraphId,
            username,
            content,
            replyToId: replyTarget?.id ?? null,
          }),
        },
      );

      const result = (await response.json()) as CommentSubmitResponse;

      if (!response.ok) {
        throw new Error(result.message ?? "提交评论失败");
      }

      setContent("");

      const message = result.message ?? "评论提交成功";
      if (result.comment?.status === "published") {
        toast.success(message);
        onPublished();
      } else if (result.comment?.status === "pending") {
        toast.info(message);
      } else {
        toast.error(message);
      }

      onSubmitted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交评论失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-[#181818]">
        <span className="text-slate-500 dark:text-slate-400">
          你的昵称（自动生成）
        </span>

        <span className="truncate font-mono font-medium text-slate-700 dark:text-slate-200">
          {username || "生成中…"}
        </span>
      </div> */}

      <div className="space-y-1">
        <label htmlFor={contentId} className="mb-2 block text-md font-medium">
          评论内容
        </label>

        <MarkdownEditor
          id={contentId}
          value={content}
          maxLength={1000}
          placeholder={
            replyTarget
              ? `回复 @${replyTarget.username}`
              : "写下你对这个段落的看法"
          }
          onChange={setContent}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "提交中" : replyTarget ? "提交回复" : "提交评论"}
        </button>
      </div>
    </form>
  );
}

export default CommentForm;
