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
  const { postSlug } = useArticleComments();
  const [open, setOpen] = useState(false);

  const panelId = `comments-${paragraphId}`;

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
          setOpen(true);
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
        <CommentDrawer
          id={panelId}
          postSlug={postSlug}
          paragraphId={paragraphId}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default CommentableParagraph;
