"use client";
import { ComponentPropsWithoutRef, useState } from "react";
import { useArticleComments } from "./ArticleCommentsProvider";
import { MessageCircle } from "lucide-react";
import CommentList from "./CommentList";
import { ParagraphComment } from "./types";
import CommentForm from "./CommentForm";

type CommentableParagraphProps = ComponentPropsWithoutRef<"p"> & {
  paragraphId: string;
};

function CommentableParagraph({
  paragraphId,
  children,
  className,
  ...paragraphProps
}: CommentableParagraphProps) {
  const { postSlug } = useArticleComments();
  const [open, setOpen] = useState(false);

  const [replyTarget, setReplyTarget] = useState<ParagraphComment | null>(null);

  const panelId = `comments-${paragraphId}`;

  const [commentsVersion, setCommentsVersion] = useState(0);

  return (
    <div className="my-[1.25em] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
      <p
        {...paragraphProps}
        data-paragraph-id={paragraphId}
        className={`m-0! ${className ?? ""}`}
      >
        {children}
      </p>
      <button
        type="button"
        aria-label="查看段评"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current);
        }}
        className="
                    not-prose
                    mt-1
                    inline-flex size-8
                    items-center justify-center
                    rounded-full text-gray-400
                    transition-colors
                    hover:bg-gray-100 hover:text-blue-600
                    dark:text-gray-500 dark:hover:bg-gray-500
                    dark:hover:text-blue-400
                "
      >
        <MessageCircle aria-hidden="true" className="size-4" />
      </button>

      {open && (
        <div
          id={panelId}
          className="
                        not-prose
                        col-span-2
                        mt-3 rounded-lg border
                        border-gray-200
                        bg-gray-50
                        p-4 text-sm
                        text-gray-600
                        dark:border-gray-700
                        dark:bg-gray-900
                        dark:text-gray-300
                    "
        >
          <CommentList
            postSlug={postSlug}
            paragraphId={paragraphId}
            onReply={setReplyTarget}
            refreshKey={commentsVersion}
          />
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <CommentForm
              postSlug={postSlug}
              paragraphId={paragraphId}
              replyTarget={replyTarget}
              onCancelReply={() => {
                setReplyTarget(null);
              }}
              onPublished={() => {
                setCommentsVersion((current) => current + 1);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default CommentableParagraph;
