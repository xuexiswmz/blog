export type ExistingAnnotationRange = {
  id: string;
  startOffset: number;
  endOffset: number;
};

export type IncomingAnnotationRange = {
  startOffset: number;
  endOffset: number;
};

export type MergedAnnotationRange = {
  startOffset: number;
  endOffset: number;
  replacedIds: string[];
};

/**
 * 将新选区和所有重叠或相接的旧画线合并。
 *
 * 例如：
 *
 * 旧画线：20–50
 * 新选区：15–40
 * 最终范围：15–50
 *
 * 新选区选择的颜色和线型由调用方应用到最终范围。
 */
export function mergeAnnotationRanges(
  existingAnnotations: ExistingAnnotationRange[],
  incomingRange: IncomingAnnotationRange,
): MergedAnnotationRange {
  let startOffset = incomingRange.startOffset;
  let endOffset = incomingRange.endOffset;

  const replacedIds = new Set<string>();

  let rangeExpanded = true;

  while (rangeExpanded) {
    rangeExpanded = false;

    for (const annotation of existingAnnotations) {
      if (replacedIds.has(annotation.id)) {
        continue;
      }

      const overlapsOrTouches =
        annotation.endOffset >= startOffset &&
        annotation.startOffset <= endOffset;

      if (!overlapsOrTouches) {
        continue;
      }

      replacedIds.add(annotation.id);

      const nextStartOffset = Math.min(startOffset, annotation.startOffset);

      const nextEndOffset = Math.max(endOffset, annotation.endOffset);

      if (nextStartOffset !== startOffset || nextEndOffset !== endOffset) {
        startOffset = nextStartOffset;
        endOffset = nextEndOffset;
        rangeExpanded = true;
      }
    }
  }

  return {
    startOffset,
    endOffset,
    replacedIds: Array.from(replacedIds),
  };
}
