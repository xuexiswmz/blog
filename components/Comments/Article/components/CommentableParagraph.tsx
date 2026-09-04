"use client";

import { type ComponentPropsWithoutRef, useState } from "react";
import { toast } from "sonner";
import CommentComposerDialog from "../../Comment/CommentComposerDialog";
import CommentDrawer from "../../Comment/CommentDrawer";
import type {
  TextAnnotationColor,
  TextAnnotationLineStyle,
  UpdateTextAnnotation,
} from "../../Comment/types";
import { useArticleComments } from "../context/ArticleCommentsContext";
import { getTextAnnotationTooltipActions } from "../utils/textAnnotationTooltipActions";
import ExistingTextAnnotationTooltip from "./ExistingTextAnnotationTooltip";
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
  const {
    postSlug,
    commentCounts,
    refreshCommentCounts,
    paragraphSelection,
    activeTextAnnotation,
    canManageTextAnnotations,
    addTextAnnotation,
    updateTextAnnotation,
    deleteTextAnnotation,
    closeActiveTextAnnotation,
  } = useArticleComments();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const drawerId = `comments-${paragraphId}`;
  const commentCount = commentCounts[paragraphId] ?? 0;

  const activeSelection =
    paragraphSelection?.paragraphId === paragraphId ? paragraphSelection : null;

  const activeAnnotation =
    activeTextAnnotation?.annotation.paragraphId === paragraphId
      ? activeTextAnnotation
      : null;

  const annotationTooltipActions = getTextAnnotationTooltipActions(
    commentCount,
    canManageTextAnnotations,
  );

  function openSelectionCommentComposer() {
    if (!activeSelection) {
      return;
    }

    setSelectedText(activeSelection.text);
    setComposerOpen(true);

    window.getSelection()?.removeAllRanges();
  }

  function openAnnotationCommentComposer() {
    if (!activeAnnotation) {
      return;
    }

    setSelectedText(activeAnnotation.annotation.selectedText);

    setComposerOpen(true);

    closeActiveTextAnnotation();
  }

  function handleCommentPublished() {
    void refreshCommentCounts();
    setDrawerOpen(true);
  }

  async function handleAddAnnotation(
    lineStyle: TextAnnotationLineStyle,
    color: TextAnnotationColor,
  ) {
    if (!activeSelection) {
      return;
    }

    try {
      await addTextAnnotation({
        paragraphId,
        startOffset: activeSelection.startOffset,
        endOffset: activeSelection.endOffset,
        selectedText: activeSelection.text,
        lineStyle,
        color,
      });

      window.getSelection()?.removeAllRanges();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加画线失败");
    }
  }

  async function handleUpdateAnnotation(input: UpdateTextAnnotation) {
    if (!activeAnnotation) {
      return;
    }

    try {
      await updateTextAnnotation(activeAnnotation.annotation.id, input);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改画线失败");

      throw error;
    }
  }

  async function handleDeleteAnnotation() {
    if (!activeAnnotation) {
      return;
    }

    try {
      await deleteTextAnnotation(activeAnnotation.annotation.id);

      closeActiveTextAnnotation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除画线失败");

      throw error;
    }
  }

  return (
    <div
      className="
        my-[1.25em]
        grid
        grid-cols-[minmax(0,1fr)_auto]
        items-start
        gap-x-2
      "
    >
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
        onAddComment={openSelectionCommentComposer}
        canManageTextAnnotations={canManageTextAnnotations}
        onAddAnnotation={handleAddAnnotation}
        onOpenComments={() => {
          setDrawerOpen(true);
        }}
      />

      {activeAnnotation && annotationTooltipActions.shouldRender && (
        <ExistingTextAnnotationTooltip
          activeTextAnnotation={activeAnnotation}
          showAddComment={annotationTooltipActions.showAddComment}
          canManageTextAnnotations={
            annotationTooltipActions.showManageAnnotation
          }
          onAddComment={openAnnotationCommentComposer}
          onUpdate={handleUpdateAnnotation}
          onDelete={handleDeleteAnnotation}
        />
      )}

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
