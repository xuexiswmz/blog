"use client";

import { useEffect } from "react";
import type { TextAnnotation, TextAnnotationColor } from "../../Comment/types";
import { createTextAnnotationRange } from "../utils/textAnnotationRange";

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

      const range = createTextAnnotationRange(paragraph, annotation);

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
