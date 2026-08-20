"use client";
import { ComponentPropsWithoutRef, useState } from "react";
import { useArticleComments } from "./ArticleCommentsProvider";
import { MessageCircle } from "lucide-react";
import CommentDrawer from "./CommentDrawer";

type CommentableParagraphProps = ComponentPropsWithoutRef<"p"> & {
  paragraphId: string;
};

function CommentableParagraph({
  paragraphId,
  children,
  className,
  ...paragraphProps
}: CommentableParagraphProps) {
  const { postSlug, commentCounts, refreshCommentCounts } =
    useArticleComments();
  const [open, setOpen] = useState(false);

  const panelId = `comments-${paragraphId}`;
  const commentCount = commentCounts[paragraphId] ?? 0;

  return (
    <div className="my-[1.25em] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
      <p
        {...paragraphProps}
        data-paragraph-id={paragraphId}
        className={`m-0! ${className ?? ""}`}
      >
        {children}
      </p>

      {commentCount > 0 && (
        <button
          type="button"
          aria-label="查看段评"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen(true);
          }}
          className="
            not-prose
            relative mt-1
            inline-flex size-9
            items-center justify-center
            rounded-full
            text-slate-400
            transition-colors
            hover:bg-slate-100
            hover:text-sky-500
            dark:text-slate-500
            dark:hover:bg-[#242424]
            dark:hover:text-sky-400
          "
        >
          <MessageCircle
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.5}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold pointer-events-none"
          >
            {commentCount > 99 ? "99+" : commentCount}
          </span>
        </button>
      )}

      {open && (
        <CommentDrawer
          id={panelId}
          postSlug={postSlug}
          paragraphId={paragraphId}
          onClose={() => {
            setOpen(false);
          }}
          onPublished={refreshCommentCounts}
        />
      )}
    </div>
  );
}

export default CommentableParagraph;
