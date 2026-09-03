"use client";

import { useState } from "react";
import {
  ActiveTextAnnotation,
  UpdateTextAnnotation,
} from "../../Comment/types";
import { createPortal } from "react-dom";
import { MessageCirclePlus, Trash2 } from "lucide-react";
import TextAnnotationControls from "./TextAnnotationControls";

type ExistingTextAnnotationTooltipProps = {
  activeTextAnnotation: ActiveTextAnnotation;

  showAddComment: boolean;

  canManageTextAnnotations: boolean;

  onAddComment: () => void;

  onUpdate: (input: UpdateTextAnnotation) => Promise<void>;

  onDelete: () => Promise<void>;
};

export default function ExistingTextAnnotationTooltip({
  activeTextAnnotation,
  showAddComment,
  canManageTextAnnotations,
  onAddComment,
  onUpdate,
  onDelete,
}: ExistingTextAnnotationTooltipProps) {
  /**
   * 修改或删除请求是否正在进行。
   *
   * 请求过程中禁用按钮，
   * 避免用户连续发送多个 PATCH 或 DELETE。
   */
  const [pending, setPending] = useState(false);

  const { annotation, position } = activeTextAnnotation;

  if (typeof document === "undefined") {
    return null;
  }

  const placementClass =
    position.placement === "top" ? "-translate-y-full" : "";

  /**
   * 统一执行异步修改和删除操作。
   *
   * catch不重复显示 toast
   * - 调用方负责根据具体操作显示：
   * - 修改画线失败
   * - 删除画线失败
   */
  async function runAction(action: () => Promise<void>) {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      await action();
    } catch {
    } finally {
      setPending(false);
    }
  }

  /**
   * Tooltip 使用 Portal 渲染到 document.body，
   * 避免受到文章容器布局和 overflow 的影响。
   *
   * pointerdown 阻止浏览器移动文字光标；
   * click 阻止事件冒泡到 document 的画线点击监听器。
   */
  return createPortal(
    <div
      data-text-annotation-tooltip
      role="toolbar"
      aria-label="已有画线操作"
      style={{
        left: position.x,
        top: position.y,
      }}
      onPointerDown={(event) => {
        event.preventDefault();
      }}
      onClick={(event) => {
        event.stopPropagation();
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
      {showAddComment && (
        <button
          type="button"
          aria-label="添加段评"
          title="添加段评"
          disabled={pending}
          onClick={onAddComment}
          className="
            inline-flex size-8 shrink-0
            items-center justify-center
            rounded-lg text-sky-600
            hover:bg-sky-50
            disabled:cursor-not-allowed
            disabled:opacity-50
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
      )}

      {showAddComment && canManageTextAnnotations && (
        <span
          className="
              mx-1 h-5 w-px shrink-0
              bg-slate-200
              dark:bg-slate-700
            "
        />
      )}

      {canManageTextAnnotations && (
        <>
          <TextAnnotationControls
            selectedColor={annotation.color}
            selectedLineStyle={annotation.lineStyle}
            disabled={pending}
            onColorSelect={(color) => {
              if (color === annotation.color) {
                return;
              }

              void runAction(() =>
                onUpdate({
                  lineStyle: annotation.lineStyle,

                  color,
                }),
              );
            }}
            onLineStyleSelect={(lineStyle) => {
              if (lineStyle === annotation.lineStyle) {
                return;
              }

              void runAction(() =>
                onUpdate({
                  lineStyle,
                  color: annotation.color,
                }),
              );
            }}
          />

          <span
            className="
              mx-1 h-5 w-px shrink-0
              bg-slate-200
              dark:bg-slate-700
            "
          />

          <button
            type="button"
            aria-label="删除整条画线"
            title="删除整条画线"
            disabled={pending}
            onClick={() => {
              void runAction(onDelete);
            }}
            className="
              inline-flex size-8 shrink-0
              items-center justify-center
              rounded-lg text-rose-500
              hover:bg-rose-50
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:text-rose-400
              dark:hover:bg-rose-950/30
            "
          >
            <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
