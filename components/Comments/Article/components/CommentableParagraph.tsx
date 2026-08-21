"use client";
import { ComponentPropsWithoutRef, useState } from "react";
import { useArticleComments } from "../context/ArticleCommentsContext";
import CommentDrawer from "../../Comment/CommentDrawer";
import ParagraphCommentTrigger from "./paragraphCommentTrigger";

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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerId = `comments-${paragraphId}`;
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

      <ParagraphCommentTrigger
        commentCount={commentCount}
        expanded={drawerOpen}
        controls={drawerId}
        onOpen={() => {
          setDrawerOpen(true);
        }}
      />

      {drawerOpen && (
        <CommentDrawer
          id={drawerId}
          postSlug={postSlug}
          paragraphId={paragraphId}
          onClose={() => {
            setDrawerOpen(false);
          }}
          onPublished={refreshCommentCounts}
        />
      )}
    </div>
  );
}

export default CommentableParagraph;
