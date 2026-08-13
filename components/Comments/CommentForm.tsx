"use client";

import { type SubmitEvent, useId, useState } from "react";
import { type CommentSubmitResponse, type ParagraphComment } from "./types";

type CommentsFormProps = {
  postSlug: string;
  paragraphId: string;
  replyTarget: ParagraphComment | null;
  onCancelReply: () => void;
  onPublished: () => void;
};

function CommentForm({
  postSlug,
  paragraphId,
  replyTarget,
  onCancelReply,
  onPublished,
}: CommentsFormProps) {
  const usernameId = useId();
  const contentId = useId();

  const [username, setUsername] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const usernameLength = [...username.trim()].length;
  const contentLength = [...content.trim()].length;

  const canSubmit =
    usernameLength >= 2 &&
    usernameLength <= 20 &&
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
      setError("");
      setSuccess("");

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
      setSuccess(result.message ?? "评论提交成功");

      onCancelReply();

      if (result.comment?.status === "published") {
        onPublished();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "提交评论失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {replyTarget && (
        <div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <span>回复 @{replyTarget.username}</span>
          <button
            type="button"
            onClick={onCancelReply}
            className=" hover:underline"
          >
            取消回复
          </button>
        </div>
      )}

      <div className=" space-y-1">
        <label htmlFor={usernameId} className=" block text-xs font-medium">
          用户名
        </label>

        <input
          id={usernameId}
          type="text"
          value={username}
          maxLength={20}
          placeholder="请输入2-20个字符"
          onChange={(event) => {
            setUsername(event.target.value);
          }}
          className=" w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950"
        />

        <p className="text-right text-xs text-gray-400">{usernameLength}/20</p>
      </div>

      <div className="space-y-1">
        <label htmlFor={contentId} className=" block text-xs font-medium">
          评论内容
        </label>

        <textarea
          id={contentId}
          value={content}
          rows={4}
          maxLength={1000}
          placeholder={
            replyTarget
              ? `回复 @${replyTarget.username}`
              : "写下你对这个段落的看法"
          }
          onChange={(event) => {
            setContent(event.target.value);
          }}
          className=" w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        />

        <p className="text-right text-xs text-gray-400">{contentLength}/1000</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className=" rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "提交中" : replyTarget ? "提交回复" : "提交评论"}
      </button>
    </form>
  );
}

export default CommentForm;
