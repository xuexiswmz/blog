"use client";

import { MessageCirclePlus } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type {
  ParagraphTextSelection,
  TextAnnotationColor,
  TextAnnotationLineStyle,
} from "../../Comment/types";
import TextAnnotationControls from "./TextAnnotationControls";

type SelectionCommentTooltipProps = {
  position: ParagraphTextSelection["position"];
  onAddComment: () => void;
  canManageTextAnnotations: boolean;
  onAddAnnotation: (
    lineStyle: TextAnnotationLineStyle,
    color: TextAnnotationColor,
  ) => void;
};

export default function SelectionCommentTooltip({
  position,
  onAddComment,
  canManageTextAnnotations,
  onAddAnnotation,
}: SelectionCommentTooltipProps) {
  const [selectedColor, setSelectedColor] =
    useState<TextAnnotationColor>("amber");

  if (typeof document === "undefined") {
    return null;
  }

  const placementClass =
    position.placement === "top" ? "-translate-y-full" : "";

  return createPortal(
    <div
      role="toolbar"
      aria-label="选中文字操作"
      style={{
        left: position.x,
        top: position.y,
      }}
      onPointerDown={(event) => {
        event.preventDefault();
      }}
      className={`
        not-prose
        fixed z-50
        -translate-x-1/2
        ${placementClass}
        flex max-w-[calc(100vw-16px)]
        items-center gap-1
        overflow-x-auto rounded-xl
        border border-slate-200
        bg-white p-1.5
        text-xs text-slate-600
        shadow-xl
        dark:border-[#303030]
        dark:bg-[#181818]
        dark:text-slate-300
      `}
    >
      <button
        type="button"
        aria-label="添加段评"
        title="添加段评"
        onClick={onAddComment}
        className="
          inline-flex size-8 shrink-0
          items-center justify-center
          rounded-lg text-sky-600
          hover:bg-sky-50
          dark:text-sky-400
          dark:hover:bg-[#242424]
        "
      >
        <MessageCirclePlus
          aria-hidden="true"
          className="size-4"
          strokeWidth={1.5}
        />
      </button>

      {canManageTextAnnotations && (
        <>
          <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

          <TextAnnotationControls
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            onLineStyleSelect={(lineStyle) => {
              onAddAnnotation(lineStyle, selectedColor);
            }}
          />
        </>
      )}
    </div>,
    document.body,
  );
}
