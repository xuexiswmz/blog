"use client";

import { useEffect, useRef, useState } from "react";
import { ParagraphComment } from "./types";
import { X } from "lucide-react";
import CommentList from "./CommentList";
import CommentComposerDialog from "./CommentComposerDialog";

type CommentDrawerProps = {
  id: string;
  postSlug: string;
  paragraphId: string;
  onClose: () => void;
  onPublished: () => Promise<void>;
};

type ComposerState =
  | { mode: "closed" }
  | { mode: "comment" }
  | { mode: "reply"; target: ParagraphComment };

export default function CommentDrawer({
  id,
  postSlug,
  paragraphId,
  onClose,
  onPublished,
}: CommentDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [composer, setComposer] = useState<ComposerState>({ mode: "closed" });

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

  function handlePublished() {
    setCommentsVersion((current) => current + 1);
    void onPublished();
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        id={id}
        aria-labelledby={`${id}-title`}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
        className="not-prose fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-black/45"
      >
        <aside className="comment-drawer-panel absolute inset-y-0 right-0 h-full flex  w-full max-w-xl flex-col border-l border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-[#303030] dark:bg-[#111111] dark:text-slate-100">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-[#303030]">
            <div className="flex items-start gap-1.5">
              <h2
                id={`${id}-title`}
                className="text-lg font-semibold leading-none"
              >
                段评
              </h2>
              <span
                aria-label={`${commentCount} 条评论`}
                className="-mt-1 text-xs font-medium text-slate-400 dark:text-slate-500"
              >
                {commentCount}
              </span>
            </div>
            <button
              type="button"
              aria-label="关闭段评"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-[#242424]"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
            <CommentList
              postSlug={postSlug}
              paragraphId={paragraphId}
              refreshKey={commentsVersion}
              onCountChange={setCommentCount}
              onReply={(comment) => {
                setComposer({
                  mode: "reply",
                  target: comment,
                });
              }}
            />
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white p-4 dark:border-[#303030] dark:bg-[#111111]">
            <button
              type="button"
              onClick={() => {
                setComposer({ mode: "comment" });
              }}
              className="w-full rounded-full border border-slate-300 px-4 py-3 text-left text-sm text-slate-500 transition-colors hover:border-sky-500 dark:border-[#3a3a3a] dark:bg-[#181818] dark:text-slate-400 dark:hover:border-sky-500"
            >
              写下你的段评
            </button>
          </footer>
        </aside>
      </dialog>

      {composer.mode === "comment" && (
        <CommentComposerDialog
          mode="comment"
          postSlug={postSlug}
          paragraphId={paragraphId}
          onClose={() => {
            setComposer({ mode: "closed" });
          }}
          onPublished={handlePublished}
        />
      )}

      {composer.mode === "reply" && (
        <CommentComposerDialog
          mode="reply"
          postSlug={postSlug}
          paragraphId={paragraphId}
          replyTarget={composer.target}
          onClose={() => {
            setComposer({ mode: "closed" });
          }}
          onPublished={handlePublished}
        />
      )}
    </>
  );
}
