import { TextAnnotation } from "../../Comment/types";

export function replaceTextAnnotation(
  annotations: TextAnnotation[],
  updatedAnnotation: TextAnnotation,
) {
  return annotations.map((annotation) =>
    annotation.id === updatedAnnotation.id ? updatedAnnotation : annotation,
  );
}

export function removeTextAnnotation(
  annotations: TextAnnotation[],
  annotationId: string,
) {
  return annotations.filter((annotation) => annotation.id !== annotationId);
}
