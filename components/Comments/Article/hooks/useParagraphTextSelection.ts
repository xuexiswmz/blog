"use client";

import { useEffect, useState } from "react";
import type { ParagraphTextSelection } from "../../Comment/types";
import { resolveParagraphSelection } from "../utils/readParagraphSelection";

function isSameSelection(
  currentSelection: ParagraphTextSelection,
  nextSelection: ParagraphTextSelection,
) {
  return (
    currentSelection.paragraphId === nextSelection.paragraphId &&
    currentSelection.text === nextSelection.text &&
    currentSelection.startOffset === nextSelection.startOffset &&
    currentSelection.endOffset === nextSelection.endOffset &&
    currentSelection.position.x === nextSelection.position.x &&
    currentSelection.position.y === nextSelection.position.y &&
    currentSelection.position.placement === nextSelection.position.placement
  );
}

export function useParagraphTextSelection() {
  const [paragraphSelection, setParagraphSelection] =
    useState<ParagraphTextSelection | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const nextSelection = resolveParagraphSelection(window.getSelection());

      setParagraphSelection((currentSelection) => {
        // 选区内容没有变化时复用旧对象，
        // 避免 Context 消费组件发生没有必要的重新渲染。
        if (!currentSelection || !nextSelection) {
          return nextSelection;
        }

        return isSameSelection(currentSelection, nextSelection)
          ? currentSelection
          : nextSelection;
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
