"use client";
import { ComponentPropsWithoutRef, useState } from "react";
import { useArticleComments } from "../context/ArticleCommentsContext";
import CommentDrawer from "../../Comment/CommentDrawer";
import ParagraphCommentTrigger from "./paragraphCommentTrigger";
import CommentComposerDialog from "../../Comment/CommentComposerDialog";
import {
  TextAnnotationColor,
  TextAnnotationLineStyle,
} from "../../Comment/types";

type CommentableParagraphProps = ComponentPropsWithoutRef<"p"> & {
  paragraphId: string;
};

function CommentableParagraph({
  paragraphId,
  children,
  className,
  ...paragraphProps
}: CommentableParagraphProps) {
  const {
    postSlug,
    commentCounts,
    refreshCommentCounts,
    paragraphSelection,
    addTextAnnotation,
  } = useArticleComments();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const drawerId = `comments-${paragraphId}`;
  const commentCount = commentCounts[paragraphId] ?? 0;

  const activeSelection =
    paragraphSelection?.paragraphId === paragraphId ? paragraphSelection : null;

  // 打开评论弹窗前保存当前选中的文字
  function openCommentComposer() {
    if (!activeSelection) {
      return;
    }

    setSelectedText(activeSelection.text);
    setComposerOpen(true);

    // 弹窗打开后清除页面选区，selectionchange 会关闭 Tooltip。
    window.getSelection()?.removeAllRanges();
  }

  // 刷新文章中的评论数量，打开抽屉展示刚发布的评论
  function handleCommentPublished() {
    void refreshCommentCounts();
    setDrawerOpen(true);
  }

  function handleAddAnnotation(
    lineStyle: TextAnnotationLineStyle,
    color: TextAnnotationColor,
  ) {
    if (!activeSelection) {
      return;
    }

    addTextAnnotation({
      paragraphId,
      startOffset: activeSelection.startOffset,
      endOffset: activeSelection.endOffset,
      selectedText: activeSelection.text,
      lineStyle,
      color,
    });

    window.getSelection()?.removeAllRanges();
  }

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
        selection={activeSelection}
        expanded={drawerOpen}
        controls={drawerId}
        onAddComment={openCommentComposer}
        onAddAnnotation={handleAddAnnotation}
        onOpenComments={() => {
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

      {composerOpen && (
        <CommentComposerDialog
          mode="comment"
          postSlug={postSlug}
          paragraphId={paragraphId}
          selectedText={selectedText}
          onClose={() => {
            setComposerOpen(false);
          }}
          onPublished={handleCommentPublished}
        />
      )}
    </div>
  );
}

export default CommentableParagraph;
