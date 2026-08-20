"use client";

import { useEffect, useRef } from "react";
import { type ParagraphComment } from "./types";
import { X } from "lucide-react";
import MarkdownContent from "./Markdown/MarkdownContent";
import CommentForm from "./CommentForm";

type CommentComposerDialogProps = {
  postSlug: string;
  paragraphId: string;
  onClose: () => void;
  onPublished: () => void;
} & (
  | { mode: "comment"; replyTarget?: never }
  | { mode: "reply"; replyTarget: ParagraphComment }
);

export default function CommentComposerDialog({
  postSlug,
  paragraphId,
  replyTarget,
  onClose,
  onPublished,
  mode,
}: CommentComposerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeReplyTarget = mode === "reply" ? replyTarget : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    dialog.showModal();
    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const avatarText = activeReplyTarget
    ? (Array.from(activeReplyTarget.username.trim())[0]?.toUpperCase() ?? "?")
    : null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reply-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="not-prose scrollbar-hide m-auto max-h-[calc(100dvh-2rem)] w-[min(640px,calc(100%-2rem))] overflow-y-auto rounded-2xl bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-black/50 dark:bg-[#111111] dark:text-slate-100"
    >
      <div className="flex min-h-14 items-center justify-between px-4">
        <button
          type="button"
          aria-label="关闭回复窗口"
          onClick={onClose}
          className="rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="size-5" />
        </button>

        <h2 id="reply-dialog-title" className="font-semibold">
          {mode === "reply" ? "回复" : "添加段评"}
        </h2>

        <div className="size-9" />
      </div>

      <div className="px-5 pb-5">
        {activeReplyTarget && (
          <div className=" flex gap-3">
            <div
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              {avatarText}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold">
                {activeReplyTarget.username}
              </span>

              <div className="scrollbar-hide mt-1 max-h-36 overflow-y-auto text-sm">
                <MarkdownContent content={activeReplyTarget.content} />
              </div>

              <p className="mt-3 text-sm text-slate-500">
                回复给{" "}
                <span className="text-sky-500">
                  @{activeReplyTarget.username}
                </span>
              </p>
            </div>
          </div>
        )}

        <div
          className={
            activeReplyTarget
              ? "mt-4 border-t border-slate-200 pt-4 dark:border-[#303030]"
              : ""
          }
        >
          <CommentForm
            postSlug={postSlug}
            paragraphId={paragraphId}
            replyTarget={activeReplyTarget}
            onPublished={onPublished}
            onSubmitted={onClose}
          />
        </div>
      </div>
    </dialog>
  );
}
