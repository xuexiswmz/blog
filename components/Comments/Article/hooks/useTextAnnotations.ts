"use client";

import { useCallback, useMemo, useState } from "react";
import type { NewTextAnnotation, TextAnnotation } from "../../Comment/types";

function readAnnotations(storageKey: string) {
  try {
    const value = localStorage.getItem(storageKey);

    if (!value) {
      return [];
    }

    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as TextAnnotation[]) : [];
  } catch {
    return [];
  }
}

export function useTextAnnotations(postSlug: string) {
  const storageKey = useMemo(() => `text-annotations:${postSlug}`, [postSlug]);

  const [annotations, setAnnotations] = useState<TextAnnotation[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    return readAnnotations(storageKey);
  });

  const addTextAnnotation = useCallback(
    (input: NewTextAnnotation) => {
      const annotation: TextAnnotation = {
        ...input,
        id: crypto.randomUUID(),
        postSlug,
        createdAt: new Date().toISOString(),
      };

      setAnnotations((currentAnnotations) => {
        // 同一个选区重新画线时，替换旧颜色和线型。
        const annotationsWithoutSameRange = currentAnnotations.filter(
          (currentAnnotation) =>
            !(
              currentAnnotation.paragraphId === input.paragraphId &&
              currentAnnotation.startOffset === input.startOffset &&
              currentAnnotation.endOffset === input.endOffset
            ),
        );

        const nextAnnotations = [...annotationsWithoutSameRange, annotation];

        localStorage.setItem(storageKey, JSON.stringify(nextAnnotations));

        return nextAnnotations;
      });
    },
    [postSlug, storageKey],
  );

  return {
    annotations,
    addTextAnnotation,
  };
}
