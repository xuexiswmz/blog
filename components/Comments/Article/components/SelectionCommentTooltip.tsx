"use client";

import { MessageCirclePlus } from "lucide-react";
import { createPortal } from "react-dom";
import type { ParagraphTextSelection } from "../../Comment/types";

type SelectionCommentTooltipProps = {
  position: ParagraphTextSelection["position"];
  onAddComment: () => void;
};

/**
 * 用户选中文字后显示的浮动段评入口。
 *
 * 通过 Portal 渲染到 document.body，
 * 不会占据段落所在的 Grid，也不会导致段落换行。
 */
export default function SelectionCommentTooltip({
  position,
  onAddComment,
}: SelectionCommentTooltipProps) {
  if (typeof document === "undefined") {
    return null;
  }

  const placementClass =
    position.placement === "top" ? "-translate-y-full" : "";

  return createPortal(
    <button
      type="button"
      aria-label="为选中的文字添加段评"
      style={{
        left: position.x,
        top: position.y,
      }}
      onPointerDown={(event) => {
        // 防止按下按钮时先清除文章选区，导致 Tooltip 消失。
        event.preventDefault();
      }}
      onClick={onAddComment}
      className={`
        not-prose
        fixed z-50
        -translate-x-1/2
        ${placementClass}
        inline-flex h-9
        items-center gap-1.5
        whitespace-nowrap rounded-full
        border border-sky-200
        bg-white px-3
        text-xs font-medium text-sky-600
        shadow-lg
        transition-colors
        hover:bg-sky-50
        dark:border-sky-900
        dark:bg-[#181818]
        dark:text-sky-400
        dark:hover:bg-[#242424]
      `}
    >
      <MessageCirclePlus
        aria-hidden="true"
        className="size-4"
        strokeWidth={1.5}
      />

      <span>添加段评</span>
    </button>,
    document.body,
  );
}
