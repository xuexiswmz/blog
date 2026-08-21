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
      const paragraph = findCommentableParagraph(range.commonAncestorContainer);
      const paragraphId = paragraph?.dataset.paragraphId;

      // 选区不属于带 data-paragraph-id 的文章段落。
      if (!paragraphId) {
        setParagraphSelection(null);
        return;
      }

      setParagraphSelection((currentSelection) => {
        // 选区内容没有变化时复用旧对象，
        // 避免 Context 消费组件发生没有必要的重新渲染。
        if (
          currentSelection?.paragraphId === paragraphId &&
          currentSelection.text === selectedText
        ) {
          return currentSelection;
        }

        return {
          paragraphId,
          text: selectedText,
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
