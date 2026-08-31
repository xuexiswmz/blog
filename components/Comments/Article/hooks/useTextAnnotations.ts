"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  NewTextAnnotation,
  TextAnnotation,
  UpdateTextAnnotation,
} from "../../Comment/types";
import {
  createTextAnnotation,
  requestTextAnnotations,
  deleteTextAnnotation as deleteTextAnnotationRequest,
  updateTextAnnotation as updateTextAnnotationRequest,
} from "../api/textAnnotationsApi";
import { buildTextAnnotationInput } from "../utils/buildTextAnnotationInput";
import {
  removeTextAnnotation,
  replaceTextAnnotation,
} from "../utils/textAnnotationCollection";

function sortAnnotations(annotations: TextAnnotation[]) {
  return [...annotations].sort((left, right) => {
    if (left.paragraphId !== right.paragraphId) {
      return left.paragraphId.localeCompare(right.paragraphId);
    }

    return left.startOffset - right.startOffset;
  });
}

export function useTextAnnotations(postSlug: string) {
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const annotationsRef = useRef<TextAnnotation[]>([]);

  const replaceAnnotations = useCallback(
    (nextAnnotations: TextAnnotation[]) => {
      const sortedAnnotations = sortAnnotations(nextAnnotations);

      annotationsRef.current = sortedAnnotations;
      setAnnotations(sortedAnnotations);
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnnotations() {
      try {
        const loadedAnnotations = await requestTextAnnotations(
          postSlug,
          controller.signal,
        );

        replaceAnnotations(loadedAnnotations);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("获取文章画线失败", error);
        toast.error(
          error instanceof Error ? error.message : "获取文章画线失败",
        );
      }
    }

    void loadAnnotations();

    return () => {
      controller.abort();
    };
  }, [postSlug, replaceAnnotations]);

  const addTextAnnotation = useCallback(
    async (input: NewTextAnnotation) => {
      const paragraph = document.querySelector<HTMLElement>(
        `[data-paragraph-id="${CSS.escape(input.paragraphId)}"]`,
      );

      if (!paragraph) {
        throw new Error("找不到需要画线的段落");
      }

      const requestInput = buildTextAnnotationInput(
        annotationsRef.current,
        input,
        paragraph.textContent ?? "",
      );

      const result = await createTextAnnotation(postSlug, requestInput);
      const replacedIds = new Set(result.replacedIds);

      replaceAnnotations([
        ...annotationsRef.current.filter(
          (annotation) => !replacedIds.has(annotation.id),
        ),
        result.annotation,
      ]);
    },
    [postSlug, replaceAnnotations],
  );

  const updateTextAnnotation = useCallback(
    async (annotationId: string, input: UpdateTextAnnotation) => {
      const updatedAnnotation = await updateTextAnnotationRequest(
        postSlug,
        annotationId,
        input,
      );

      replaceAnnotations(
        replaceTextAnnotation(annotationsRef.current, updatedAnnotation),
      );
    },
    [postSlug, replaceAnnotations],
  );

  const deleteTextAnnotation = useCallback(
    async (annotationId: string) => {
      await deleteTextAnnotationRequest(postSlug, annotationId);

      replaceAnnotations(
        removeTextAnnotation(annotationsRef.current, annotationId),
      );
    },
    [postSlug, replaceAnnotations],
  );

  return {
    annotations,
    addTextAnnotation,
    updateTextAnnotation,
    deleteTextAnnotation,
  };
}
