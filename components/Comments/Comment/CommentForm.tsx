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
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <MarkdownEditor
        id={contentId}
        value={content}
        maxLength={1000}
        variant="composer"
        placeholder={
          replyTarget
            ? `回复 @${replyTarget.username}`
            : "写下你对这个段落的看法"
        }
        onChange={setContent}
        footerActions={
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-slate-950 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {submitting ? "提交中" : replyTarget ? "提交回复" : "提交评论"}
          </button>
        }
      />
    </form>
  );
}

export default CommentForm;
