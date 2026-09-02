import { TextAnnotation } from "../../Comment/types";

export function findTextAnnotationAtOffset(
  annotations: TextAnnotation[],
  paragraphId: string,
  offset: number,
) {
  return (
    annotations.find(
      (annotation) =>
        annotation.paragraphId === paragraphId &&
        annotation.startOffset <= offset &&
        offset <= annotation.endOffset,
    ) ?? null
  );
}
