"use client";

import { useEffect } from "react";
import type { TextAnnotation, TextAnnotationColor } from "../../Comment/types";

const COLORS: TextAnnotationColor[] = [
  "amber",
  "rose",
  "sky",
  "emerald",
  "violet",
];

const HIGHLIGHT_NAMES = COLORS.flatMap((color) => [
  `text-annotation-solid-${color}`,
  `text-annotation-double-inner-${color}`,
  `text-annotation-double-outer-${color}`,
  `text-annotation-wavy-${color}`,
]);

function getAnnotationHighlightNames(annotation: TextAnnotation) {
  if (annotation.lineStyle === "double") {
    return [
      `text-annotation-double-inner-${annotation.color}`,
      `text-annotation-double-outer-${annotation.color}`,
    ];
  }

  return [`text-annotation-${annotation.lineStyle}-${annotation.color}`];
}

function findTextPoint(root: HTMLElement, targetOffset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let remainingOffset = targetOffset;
  let currentNode = walker.nextNode();

  while (currentNode) {
    const textNode = currentNode as Text;
    const textLength = textNode.data.length;

    if (remainingOffset <= textLength) {
      return {
        node: textNode,
        offset: remainingOffset,
      };
    }

    remainingOffset -= textLength;
    currentNode = walker.nextNode();
  }

  return null;
}

function createAnnotationRange(
  paragraph: HTMLElement,
  annotation: TextAnnotation,
) {
  const start = findTextPoint(paragraph, annotation.startOffset);

  const end = findTextPoint(paragraph, annotation.endOffset);

  if (!start || !end) {
    return null;
  }

  const range = document.createRange();

  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);

  // 文章内容被修改后，不显示位置已经失效的旧画线。
  if (range.toString() !== annotation.selectedText) {
    return null;
  }

  return range;
}

export function useTextAnnotationHighlights(annotations: TextAnnotation[]) {
  useEffect(() => {
    if (!("highlights" in CSS) || typeof Highlight === "undefined") {
      return;
    }

    for (const highlightName of HIGHLIGHT_NAMES) {
      CSS.highlights.delete(highlightName);
    }

    const rangesByHighlight = new Map<string, Range[]>();

    for (const annotation of annotations) {
      const paragraph = document.querySelector<HTMLElement>(
        `[data-paragraph-id="${CSS.escape(annotation.paragraphId)}"]`,
      );

      if (!paragraph) {
        continue;
      }

      const range = createAnnotationRange(paragraph, annotation);

      if (!range) {
        continue;
      }

      const highlightNames = getAnnotationHighlightNames(annotation);

      for (const highlightName of highlightNames) {
        const ranges = rangesByHighlight.get(highlightName) ?? [];

        // 双线的两层分别保存 Range，避免相互影响。
        ranges.push(range.cloneRange());
        rangesByHighlight.set(highlightName, ranges);
      }
    }

    for (const [highlightName, ranges] of rangesByHighlight) {
      CSS.highlights.set(highlightName, new Highlight(...ranges));
    }

    return () => {
      for (const highlightName of HIGHLIGHT_NAMES) {
        CSS.highlights.delete(highlightName);
      }
    };
  }, [annotations]);
}
