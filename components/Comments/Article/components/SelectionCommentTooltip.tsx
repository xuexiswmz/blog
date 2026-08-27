"use client";

import { MessageCirclePlus } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type {
  ParagraphTextSelection,
  TextAnnotationColor,
  TextAnnotationLineStyle,
} from "../../Comment/types";

type SelectionCommentTooltipProps = {
  position: ParagraphTextSelection["position"];
  onAddComment: () => void;
  onAddAnnotation: (
    lineStyle: TextAnnotationLineStyle,
    color: TextAnnotationColor,
  ) => void;
};

const COLORS: Array<{
  name: TextAnnotationColor;
  label: string;
  value: string;
}> = [
  { name: "amber", label: "黄色", value: "#f59e0b" },
  { name: "rose", label: "红色", value: "#f43f5e" },
  { name: "sky", label: "蓝色", value: "#0ea5e9" },
  { name: "emerald", label: "绿色", value: "#10b981" },
  { name: "violet", label: "紫色", value: "#8b5cf6" },
];

const LINE_STYLES: Array<{
  name: TextAnnotationLineStyle;
  label: string;
}> = [
  { name: "solid", label: "直线" },
  { name: "double", label: "双线" },
  { name: "wavy", label: "波浪" },
];

export default function SelectionCommentTooltip({
  position,
  onAddComment,
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

      <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

      {COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          aria-label={`选择${color.label}`}
          title={color.label}
          onClick={() => {
            setSelectedColor(color.name);
          }}
          style={{ backgroundColor: color.value }}
          className={`
            size-5 shrink-0 rounded-full
            ring-offset-2
            ring-offset-white
            dark:ring-offset-[#181818]
            ${
              selectedColor === color.name
                ? "ring-2 ring-slate-700 dark:ring-slate-200"
                : ""
            }
          `}
        />
      ))}

      <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

      {LINE_STYLES.map((lineStyle) => (
        <button
          key={lineStyle.name}
          type="button"
          onClick={() => {
            onAddAnnotation(lineStyle.name, selectedColor);
          }}
          className="
            shrink-0 rounded-lg
            px-2 py-1.5
            hover:bg-slate-100
            dark:hover:bg-[#242424]
          "
        >
          {lineStyle.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
