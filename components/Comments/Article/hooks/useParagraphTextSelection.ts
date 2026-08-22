"use client";

import { useEffect, useState } from "react";
import { ParagraphTextSelection } from "../../Comment/types";

/**
 * 根据选区中的节点，寻找它所属的可评论段落。
 *
 * range.commonAncestorContainer 既可能是 Element，
 * 也可能是文本节点，因此不能直接调用 closest()。
 */
function findCommentableParagraph(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest<HTMLElement>("[data-paragraph-id]") ?? null;
}

// 获取选区最后一行的位置
function getSelectionRect(range: Range) {
  const rects = range.getClientRects();
  return rects.item(rects.length - 1) ?? range.getBoundingClientRect();
}

// 计算 Tooltip 相对于浏览器视口的位置。
function getTooltipPosition(range: Range) {
  const rect = getSelectionRect(range);

  const x = Math.min(
    Math.max(rect.left + rect.width / 2, 72),
    window.innerWidth - 72,
  );

  const hasEnoughSpaceAbove = rect.top >= 48;

  return {
    x,
    y: hasEnoughSpaceAbove ? rect.top - 8 : rect.bottom + 8,
    placement: hasEnoughSpaceAbove ? ("top" as const) : ("bottom" as const),
  };
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function findSelectedParagraph(range: Range, selectedText: string) {
  const paragraph =
    findCommentableParagraph(range.startContainer) ??
    findCommentableParagraph(range.endContainer);

  if (!paragraph) {
    return null;
  }

  const paragraphText = normalizeText(paragraph.textContent ?? "");
  const normalizedSelection = normalizeText(selectedText);

  if (!paragraphText.includes(normalizedSelection)) {
    return null;
  }

  return paragraph;
}

export function useParagraphTextSelection() {
  const [paragraphSelection, setParagraphSelection] =
    useState<ParagraphTextSelection | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();

      // 没有选区、只有光标或者浏览器没有可读取的 Range。
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setParagraphSelection(null);
        return;
      }

      const selectedText = selection.toString().trim();

      // 只选择空格或换行时，不显示添加段评入口。
      if (!selectedText) {
        setParagraphSelection(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const paragraph = findSelectedParagraph(range, selectedText);
      const paragraphId = paragraph?.dataset.paragraphId;

      if (!paragraphId) {
        setParagraphSelection(null);
        return;
      }

      const position = getTooltipPosition(range);

      setParagraphSelection((currentSelection) => {
        // 选区内容没有变化时复用旧对象，
        // 避免 Context 消费组件发生没有必要的重新渲染。
        if (
          currentSelection?.paragraphId === paragraphId &&
          currentSelection.text === selectedText &&
          currentSelection.position.x === position.x &&
          currentSelection.position.y === position.y &&
          currentSelection.position.placement === position.placement
        ) {
          return currentSelection;
        }

        return {
          paragraphId,
          text: selectedText,
          position,
        };
      });
    }

    // selectionchange 是 document 级事件，
    // 整篇文章只需要注册一个监听器。
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  return paragraphSelection;
}
