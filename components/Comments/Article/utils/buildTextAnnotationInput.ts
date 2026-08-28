import { mergeAnnotationRanges } from "@/lib/text-annotations/utils/mergeAnnotationRanges";
import type {
  NewTextAnnotation,
  TextAnnotation,
} from "../../Comment/types";

export function buildTextAnnotationInput(
  annotations: TextAnnotation[],
  input: NewTextAnnotation,
  paragraphText: string,
): NewTextAnnotation {
  const paragraphAnnotations = annotations.filter(
    (annotation) => annotation.paragraphId === input.paragraphId,
  );

  const mergedRange = mergeAnnotationRanges(
    paragraphAnnotations,
    {
      startOffset: input.startOffset,
      endOffset: input.endOffset,
    },
  );

  return {
    ...input,
    startOffset: mergedRange.startOffset,
    endOffset: mergedRange.endOffset,
    selectedText: paragraphText.slice(
      mergedRange.startOffset,
      mergedRange.endOffset,
    ),
  };
}
